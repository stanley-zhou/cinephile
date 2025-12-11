/* =========================================================================
   CINEPHILE – Application SQL Queries
   These are the queries used by the Express backend (index.js).

   Tables:
     movies, people, roles, genres, movie_genres,
     person_known_for, market_info, countries, movie_production_countries

   Notation:
     - Parameters $1, $2, ... are bound in Node (index.js).
     - Queries marked [COMPLEX] use CTEs, window functions, or non-trivial
       aggregations / joins and are intended to satisfy the project rubric.
===========================================================================*/

/* 0. Health Check ---------------------------------------------------------*/

-- /db-health
SELECT NOW() AS now;


/* 1. Top Rated Popular Movies ---------------------------------------------
   Simple high-level “discover” view of popular, highly-rated films.
---------------------------------------------------------------------------*/

-- /movies/popular/high-rated
SELECT
    movie_id,
    title,
    release_year,
    rating,
    num_votes
FROM movies
WHERE num_votes >= 10000
ORDER BY rating DESC, num_votes DESC
LIMIT 20;


/* 2. Genres for a Given Movie ---------------------------------------------
   Look up all genres for a specific title.
---------------------------------------------------------------------------*/

-- /movies/:title/genres  (param: $1 = exact movie title)
SELECT
    m.title,
    m.rating,
    m.num_votes,
    g.genre_name
FROM movies       AS m
         JOIN movie_genres AS mg ON m.movie_id = mg.movie_id
         JOIN genres       AS g  ON mg.genre_id = g.genre_id
WHERE m.title = $1
ORDER BY g.genre_name;


/* 3. Genre Rating Statistics  [COMPLEX] -----------------------------------
   Aggregate rating statistics across genres with a quality filter.
---------------------------------------------------------------------------*/

-- /genres/stats/ratings
SELECT
    g.genre_name,
    COUNT(*)      AS num_movies,
    AVG(m.rating) AS avg_rating
FROM genres       AS g
         JOIN movie_genres AS mg ON g.genre_id = mg.genre_id
         JOIN movies       AS m  ON mg.movie_id = m.movie_id
WHERE m.num_votes >= 10000
GROUP BY g.genre_name
HAVING COUNT(*) >= 50
ORDER BY avg_rating DESC;


/* 4. Elite Directors  [COMPLEX] -------------------------------------------
   Directors whose filmography (popular titles only) is significantly
   above the global average rating.
---------------------------------------------------------------------------*/

-- /directors/above-average
WITH global_avg AS (
    SELECT AVG(rating) AS avg_rating
    FROM movies
    WHERE num_votes >= 10000
)
SELECT
    p.person_id,
    p.name,
    COUNT(*)      AS num_directed_popular_movies,
    AVG(m.rating) AS director_avg_rating
FROM people AS p
         JOIN roles  AS r ON p.person_id = r.person_id
         JOIN movies AS m ON r.movie_id  = m.movie_id
WHERE r.role = 'director'
  AND m.num_votes >= 10000
GROUP BY p.person_id, p.name
HAVING
    COUNT(*) >= 5
   AND AVG(m.rating) >= (
    SELECT avg_rating + 0.5
    FROM global_avg
)
ORDER BY
    director_avg_rating DESC,
    num_directed_popular_movies DESC,
    p.name;


/* 5. Dynamic Duos – Frequent Co-Stars  [COMPLEX] --------------------------
   Actor/actress pairs that repeatedly co-star in popular titles.
---------------------------------------------------------------------------*/

-- /actors/frequent-pairs
SELECT
    p1.person_id AS actor1_id,
    p1.name      AS actor1_name,
    p2.person_id AS actor2_id,
    p2.name      AS actor2_name,
    COUNT(*)     AS num_movies_together
FROM roles AS r1
         JOIN roles AS r2
              ON r1.movie_id  = r2.movie_id
                  AND r1.person_id < r2.person_id   -- avoid duplicates & self-pairs
         JOIN movies AS m
              ON r1.movie_id  = m.movie_id
         JOIN people AS p1
              ON r1.person_id = p1.person_id
         JOIN people AS p2
              ON r2.person_id = p2.person_id
WHERE r1.role IN ('actor', 'actress')
  AND r2.role IN ('actor', 'actress')
  AND m.num_votes >= 50000
GROUP BY
    p1.person_id, p1.name,
    p2.person_id, p2.name
HAVING COUNT(*) >= 3
ORDER BY
    num_movies_together DESC,
    actor1_name,
    actor2_name
LIMIT 10;


/* 6. High-Rated “Known-For” People  [COMPLEX] -----------------------------
   People whose known-for movies are both highly rated and popular.
---------------------------------------------------------------------------*/

-- /people/high-rated-knownfor
WITH person_stats AS (
    SELECT
        p.person_id,
        p.name,
        COUNT(*)          AS num_known_for,
        AVG(m.rating)     AS avg_rating,
        AVG(m.num_votes)  AS avg_votes
    FROM people p
             JOIN person_known_for pk ON pk.person_id = p.person_id
             JOIN movies m            ON m.movie_id   = pk.movie_id
    GROUP BY p.person_id, p.name
)
SELECT
    person_id,
    name,
    num_known_for,
    avg_rating,
    avg_votes
FROM person_stats
WHERE num_known_for >= 2
  AND avg_rating   >= 8.5
  AND avg_votes    >= 10000
ORDER BY avg_rating DESC, avg_votes DESC, name
LIMIT 20;


/* 7. Prolific Actors / Actresses -----------------------------------------
   Simple ranking of actors/actresses by number of acting roles.
---------------------------------------------------------------------------*/

-- /actors/prolific
SELECT
    p.person_id,
    p.name,
    COUNT(*) AS num_acting_roles
FROM people AS p
         JOIN roles  AS r ON p.person_id = r.person_id
WHERE r.role IN ('actor', 'actress')
GROUP BY p.person_id, p.name
ORDER BY num_acting_roles DESC
LIMIT 20;


/* 8. Best-Rated Movie per Decade  [COMPLEX] -------------------------------
   Uses window functions to pick the top movie in each decade.
---------------------------------------------------------------------------*/

-- /movies/best-per-decade
WITH popular AS (
    SELECT *
    FROM movies
    WHERE release_year IS NOT NULL
      AND rating       IS NOT NULL
      AND num_votes >= 10000
),
     ranked AS (
         SELECT
             FLOOR(release_year / 10) * 10 AS decade_start_year,
             movie_id,
             title,
             rating,
             num_votes,
             ROW_NUMBER() OVER (
                 PARTITION BY FLOOR(release_year / 10) * 10
                 ORDER BY rating DESC, num_votes DESC, title
                 ) AS rn
         FROM popular
     )
SELECT
    decade_start_year,
    movie_id,
    title,
    rating,
    num_votes
FROM ranked
WHERE rn = 1
ORDER BY decade_start_year;


/* 9. Known-For Movies for a Person --------------------------------------*/

-- /people/:name/known-for  (param: $1 = person name, ILIKE)
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.rating,
    m.num_votes
FROM people p
         JOIN person_known_for pkf
              ON pkf.person_id = p.person_id
         JOIN movies m
              ON m.movie_id = pkf.movie_id
WHERE p.name ILIKE $1
ORDER BY m.rating DESC, m.num_votes DESC, m.title
LIMIT 20;


/* 10. Drama + Romance Cross-Genre Filter --------------------------------*/

-- /movies/genre/drama-romance
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.rating,
    m.num_votes
FROM movies AS m
         JOIN movie_genres mg1 ON m.movie_id = mg1.movie_id
         JOIN genres      g1  ON mg1.genre_id = g1.genre_id
         JOIN movie_genres mg2 ON m.movie_id = mg2.movie_id
         JOIN genres      g2  ON mg2.genre_id = g2.genre_id
WHERE g1.genre_name = 'Drama'
  AND g2.genre_name = 'Romance'
  AND m.rating IS NOT NULL
  AND m.num_votes >= 10000
ORDER BY m.rating DESC, m.num_votes DESC, m.title;


/* 11. Hidden Gems – High Rating, Low Popularity --------------------------*/

-- /movies/hidden-gems
SELECT
    movie_id,
    title,
    release_year,
    rating,
    num_votes
FROM movies
WHERE rating >= 8.0
  AND num_votes BETWEEN 1000 AND 10000
ORDER BY rating DESC, num_votes ASC
LIMIT 50;


/* 12. High-Budget, Low-Rating Flops  [COMPLEX] ---------------------------
   Join IMDb ratings with TMDb financials to find “big budget flops”.
---------------------------------------------------------------------------*/

-- /analytics/high-budget-low-rating
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.rating      AS imdb_rating,
    m.num_votes,
    mi.budget,
    mi.revenue,
    (mi.revenue - mi.budget) AS profit
FROM movies m
         JOIN market_info mi
              ON mi.imdb_id = m.movie_id
WHERE
    mi.budget IS NOT NULL
  AND mi.revenue IS NOT NULL
  AND mi.budget >= 60000000       -- big budget (60M+)
  AND m.rating <= 5.5             -- low rating
  AND m.num_votes >= 20000
  AND mi.revenue < mi.budget * 1.1
ORDER BY
    profit ASC,
    m.rating ASC,
    m.num_votes DESC
LIMIT 20;


/* 13. Highest-ROI Movies  [COMPLEX] --------------------------------------
   Uses ROI = (revenue - budget) / budget on cross-dataset join.
---------------------------------------------------------------------------*/

-- /analytics/high-roi-movies
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.rating      AS imdb_rating,
    m.num_votes,
    mi.budget,
    mi.revenue,
    (mi.revenue - mi.budget) * 1.0 / NULLIF(mi.budget, 0) AS roi
FROM market_info AS mi
         JOIN movies      AS m
              ON mi.imdb_id = m.movie_id
WHERE
    mi.budget  >= 10000            -- ignore tiny/fake budgets
  AND mi.revenue > 0
  AND m.num_votes >= 10000
  AND mi.revenue >= mi.budget    -- at least break-even
  AND m.rating >= 6.0
ORDER BY
    roi DESC,
    m.num_votes DESC
LIMIT 50;


/* 14. Country Spotlight Stats  [COMPLEX] ---------------------------------
   Aggregates financial and rating info by production country.
   Backend chooses ORDER BY based on ?sort = rating | revenue | roi | movies.
---------------------------------------------------------------------------*/

-- /analytics/country-stats (SELECT portion; ORDER BY varies in Node)
SELECT
    c.country_name,
    COUNT(*)        AS num_movies,
    AVG(m.rating)   AS avg_rating,
    SUM(mi.revenue) AS total_revenue,
    AVG(
            CASE
                WHEN mi.budget IS NOT NULL
                    AND mi.budget > 0
                    AND mi.revenue IS NOT NULL
                    THEN mi.revenue::numeric / mi.budget
                ELSE NULL
                END
    ) AS avg_roi
FROM movies m
         JOIN market_info mi
              ON mi.imdb_id = m.movie_id
         JOIN movie_production_countries mpc
              ON mpc.tmdb_id = mi.tmdb_id
         JOIN countries c
              ON c.country_name = mpc.country_name
WHERE
    m.num_votes >= 20000
  AND mi.revenue IS NOT NULL
GROUP BY c.country_name
HAVING COUNT(*) >= 15
-- Example ORDER BY choices in backend:
--   rating : ORDER BY avg_rating   DESC, total_revenue DESC
--   revenue: ORDER BY total_revenue DESC, avg_rating   DESC
--   roi    : ORDER BY avg_roi      DESC, avg_rating   DESC
--   movies : ORDER BY num_movies   DESC, avg_rating   DESC
LIMIT 20;


/* 15. Movie Details for Modal Popup  [COMPLEX] ---------------------------
   Rich per-movie view combining genres, countries, directors and a
   “top cast” list derived via a nested query and counts.
---------------------------------------------------------------------------*/

-- /movies/:movieId/details  (param: $1 = movie_id)
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.runtime_minutes,
    m.rating,
    m.num_votes,
    mi.overview,
    mi.poster_path,
    ARRAY_AGG(DISTINCT c.country_name)
    FILTER (WHERE c.country_name IS NOT NULL) AS countries,
    ARRAY_AGG(DISTINCT g.genre_name)
    FILTER (WHERE g.genre_name IS NOT NULL) AS genres,
    ARRAY_AGG(DISTINCT p_dir.name)
    FILTER (WHERE r.role = 'director')       AS directors,
    (
        SELECT ARRAY(
                       SELECT p_cast.name
                       FROM (
                                SELECT DISTINCT r_cast.person_id
                                FROM roles r_cast
                                WHERE r_cast.movie_id = m.movie_id
                                  AND r_cast.role IN ('actor', 'actress')
                            ) movie_cast
                                JOIN people p_cast
                                     ON p_cast.person_id = movie_cast.person_id
                                LEFT JOIN roles all_roles
                                          ON all_roles.person_id = movie_cast.person_id
                                              AND all_roles.role IN ('actor', 'actress')
                       GROUP BY p_cast.person_id, p_cast.name
                       ORDER BY COUNT(all_roles.movie_id) DESC, p_cast.name
                       LIMIT 3
               )
    ) AS cast
FROM movies m
         LEFT JOIN movie_genres mg
                   ON mg.movie_id = m.movie_id
         LEFT JOIN genres g
                   ON g.genre_id = mg.genre_id
         LEFT JOIN roles r
                   ON r.movie_id = m.movie_id
         LEFT JOIN people p_dir
                   ON p_dir.person_id = r.person_id
         LEFT JOIN market_info mi
                   ON mi.imdb_id = m.movie_id
         LEFT JOIN movie_production_countries mpc
                   ON mpc.tmdb_id = mi.tmdb_id
         LEFT JOIN countries c
                   ON c.country_name = mpc.country_name
WHERE m.movie_id = $1
GROUP BY
    m.movie_id,
    m.title,
    m.release_year,
    m.runtime_minutes,
    m.rating,
    m.num_votes,
    mi.overview,
    mi.poster_path;


/* 16. Explore Movies – Paginated Table  [COMPLEX] ------------------------
   Backend dynamically builds WHERE + ORDER BY based on:
     - search (title substring, optional)
     - sort   (year/runtime/rating/votes asc/desc)
     - limit / offset for pagination.
---------------------------------------------------------------------------*/

-- 16a. Page of rows  (parameters: search-related + $N-1 = limit, $N = offset)
SELECT
    m.movie_id,
    m.title,
    m.release_year,
    m.runtime_minutes,
    m.rating,
    m.num_votes,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT g.genre_name), NULL) AS genres
FROM movies m
         LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
         LEFT JOIN genres       g  ON mg.genre_id = g.genre_id
-- WHERE in backend:
--   IF searchTerm:
--       LOWER(m.title) LIKE $1
--   ELSE:
--       m.num_votes >= 1000
--       AND m.rating IS NOT NULL
GROUP BY
    m.movie_id,
    m.title,
    m.release_year,
    m.runtime_minutes,
    m.rating,
    m.num_votes
-- ORDER BY picked in backend from:
--   m.release_year      ASC|DESC
--   m.runtime_minutes   ASC|DESC
--   m.rating            ASC|DESC
--   m.num_votes         ASC|DESC
LIMIT $N-1 OFFSET $N;

-- 16b. Total matching movies (same WHERE filters, no GROUP BY / ORDER BY)
SELECT COUNT(DISTINCT m.movie_id) AS total
FROM movies m
         LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
         LEFT JOIN genres       g  ON mg.genre_id = g.genre_id
-- WHERE identical to 16a for consistency;
