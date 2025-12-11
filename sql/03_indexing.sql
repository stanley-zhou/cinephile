/* ============================================================
   CINEPHILE – Supporting Indexes
   Main targets: Q3, Q4, Q5, Q6, Q8, Q12, Q13, Q14, Q15, Q16
   (and several simpler queries as a side effect)
   ============================================================ */

-- 1) MOVIES: ratings, votes, year, runtime, title search
--    Helps Q1, Q3, Q4, Q8, Q11, Q12, Q13, Q16

CREATE INDEX IF NOT EXISTS idx_movies_rating_votes
    ON movies (rating DESC, num_votes DESC);

CREATE INDEX IF NOT EXISTS idx_movies_year_rating_votes
    ON movies (release_year, rating DESC, num_votes DESC);

CREATE INDEX IF NOT EXISTS idx_movies_runtime
    ON movies (runtime_minutes);

CREATE INDEX IF NOT EXISTS idx_movies_title_lower
    ON movies ((LOWER(title)));


-- 2) PEOPLE + ROLES
--    Helps Q4 (elite directors), Q5 (dynamic duos),
--          Q6 & Q7 (people stats), Q9, Q15 (directors / cast)

-- Case-insensitive lookup by name (Q9 person-known-for)
CREATE INDEX IF NOT EXISTS idx_people_name_lower
    ON people ((LOWER(name)));

-- Roles by movie + role (join + role filter; Q4, Q5, Q15)
CREATE INDEX IF NOT EXISTS idx_roles_movie_role_person
    ON roles (movie_id, role, person_id);

-- Roles by person + role (Q4 directors; Q7 prolific actors)
CREATE INDEX IF NOT EXISTS idx_roles_person_role
    ON roles (person_id, role);


-- 3) GENRES + MOVIE_GENRES
--    Helps Q3 (genre stats), Q10 (Drama+Romance),
--          Q15 (details), Q16 (explore with genres)

-- Look up a genre by name (Drama / Romance equality tests)
CREATE INDEX IF NOT EXISTS idx_genres_name
    ON genres (genre_name);

-- From genre → movies (Q3, Q10)
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_movie
    ON movie_genres (genre_id, movie_id);

-- From movie → genres (Q15, Q16)
CREATE INDEX IF NOT EXISTS idx_movie_genres_movie_genre
    ON movie_genres (movie_id, genre_id);


-- 4) PERSON_KNOWN_FOR
--    Helps Q6 (high-rated known-for people), Q9 (person known-for)

CREATE INDEX IF NOT EXISTS idx_person_known_for_person_movie
    ON person_known_for (person_id, movie_id);

CREATE INDEX IF NOT EXISTS idx_person_known_for_movie_person
    ON person_known_for (movie_id, person_id);


-- 5) MARKET_INFO + COUNTRIES
--    Helps Q12, Q13, Q14, Q15

-- Join from movies → market_info and filter on budget / revenue
CREATE INDEX IF NOT EXISTS idx_market_info_imdb_budget_revenue
    ON market_info (imdb_id, budget, revenue);

-- Join from market_info → production countries (via tmdb_id)
CREATE INDEX IF NOT EXISTS idx_market_info_tmdb
    ON market_info (tmdb_id);

-- tmdb_id + country_name for country aggregation (Q14, Q15)
CREATE INDEX IF NOT EXISTS idx_movie_prod_countries_tmdb_country
    ON movie_production_countries (tmdb_id, country_name);

-- In case country_name is not already the PK
CREATE INDEX IF NOT EXISTS idx_countries_name
    ON countries (country_name);



/* Drop Cinephile supporting indexes (if needed) */

-- 1) MOVIES
DROP INDEX IF EXISTS idx_movies_rating_votes;
DROP INDEX IF EXISTS idx_movies_year_rating_votes;
DROP INDEX IF EXISTS idx_movies_runtime;
DROP INDEX IF EXISTS idx_movies_title_lower;

-- 2) PEOPLE + ROLES
DROP INDEX IF EXISTS idx_people_name_lower;
DROP INDEX IF EXISTS idx_roles_movie_role_person;
DROP INDEX IF EXISTS idx_roles_person_role;

-- 3) GENRES + MOVIE_GENRES
DROP INDEX IF EXISTS idx_genres_name;
DROP INDEX IF EXISTS idx_movie_genres_genre_movie;
DROP INDEX IF EXISTS idx_movie_genres_movie_genre;

-- 4) PERSON_KNOWN_FOR
DROP INDEX IF EXISTS idx_person_known_for_person_movie;
DROP INDEX IF EXISTS idx_person_known_for_movie_person;

-- 5) MARKET_INFO + COUNTRIES
DROP INDEX IF EXISTS idx_market_info_imdb_budget_revenue;
DROP INDEX IF EXISTS idx_market_info_tmdb;
DROP INDEX IF EXISTS idx_movie_prod_countries_tmdb_country;
DROP INDEX IF EXISTS idx_countries_name;
