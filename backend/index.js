const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to AWS RDS
const pool = new Pool({
  host: 'cis5500finalproject.c3ai0u00ir5v.us-east-1.rds.amazonaws.com',   
  port: 5432,                      
  user: 'group15',
  password: 'Group15OfCIS5500!', 
  database: 'imdb_db',   
  ssl: { rejectUnauthorized: false } 
});


// test API
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.get('/db-health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB health check failed:', err);
    res.status(500).send('DB connection error');
  }
});

// Route 1 — High-Rated Popular Movies (Query 1)
app.get('/movies/popular/high-rated', async (req, res) => {
  try {
    const query = `
      SELECT
        movie_id,
        title,
        release_year,
        rating,
        num_votes
      FROM Movies
      WHERE num_votes >= 10000
      ORDER BY rating DESC, num_votes DESC
      LIMIT 20;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /movies/popular/high-rated:', err);
    res.status(500).send('Database error');
  }
});


// Route 2 — All Genres for a Movie (Query 2)
// GET /movies/:title/genres
app.get('/movies/:title/genres', async (req, res) => {
  try {
    const { title } = req.params;  // movie title from URL

    const query = `
      SELECT
        m.title,
        m.rating,
        m.num_votes,
        g.genre_name
      FROM Movies AS m
      JOIN movie_genres AS mg ON m.movie_id = mg.movie_id
      JOIN Genres AS g ON mg.genre_id = g.genre_id
      WHERE m.title = $1
      ORDER BY g.genre_name;
    `;

    const result = await pool.query(query, [title]);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /movies/:title/genres:', err);
    res.status(500).send('Database error');
  }
});

// Route 3 — Average Rating by Genre (Complex Query 3)
// GET /genres/stats/ratings
app.get('/genres/stats/ratings', async (req, res) => {
  try {
    const query = `
      SELECT
          g.genre_name,
          COUNT(*) AS num_movies,
          AVG(m.rating) AS avg_rating
      FROM Genres AS g
      JOIN movie_genres AS mg ON g.genre_id = mg.genre_id
      JOIN Movies AS m ON mg.movie_id = m.movie_id
      WHERE m.num_votes >= 10000
      GROUP BY g.genre_name
      HAVING COUNT(*) >= 50
      ORDER BY avg_rating DESC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);   // list of { genre_name, num_movies, avg_rating }
  } catch (err) {
    console.error('Database error on /genres/stats/ratings:', err);
    res.status(500).send('Database error');
  }
});


// Route 4 — Directors With Above-Average Movies (Complex Query 4)
// GET /directors/above-average
app.get('/directors/above-average', async (req, res) => {
  try {
    const query = `
      WITH global_avg AS (
          SELECT AVG(rating) AS avg_rating
          FROM Movies
          WHERE num_votes >= 10000      -- only popular movies
      )
      SELECT
          p.person_id,
          p.name,
          COUNT(*)      AS num_directed_popular_movies,
          AVG(m.rating) AS director_avg_rating
      FROM People AS p
      JOIN Roles  AS r ON p.person_id = r.person_id
      JOIN Movies AS m ON r.movie_id   = m.movie_id
      WHERE r.role = 'director'
        AND m.num_votes >= 10000       -- only consider popular movies
      GROUP BY p.person_id, p.name
      HAVING
          COUNT(*) >= 5                -- at least 5 popular movies
          AND AVG(m.rating) >= (
              SELECT avg_rating + 0.5  -- significantly above global avg
              FROM global_avg
          )
      ORDER BY
          director_avg_rating DESC,
          num_directed_popular_movies DESC,
          p.name;
    `;

    const result = await pool.query(query);
    res.json(result.rows); // person_id, name, num_directed_popular_movies, director_avg_rating
  } catch (err) {
    console.error('Database error on /directors/above-average:', err);
    res.status(500).send('Database error');
  }
});


// Route 5 — Actor Pairs Who Frequently Co-Star (Complex Query 5)
// GET /actors/frequent-pairs
app.get('/actors/frequent-pairs', async (req, res) => {
  try {
    const query = `
      SELECT
          p1.person_id AS actor1_id,
          p1.name      AS actor1_name,
          p2.person_id AS actor2_id,
          p2.name      AS actor2_name,
          COUNT(*)     AS num_movies_together
      FROM Roles AS r1
      JOIN Roles AS r2
        ON r1.movie_id   = r2.movie_id
       AND r1.person_id  < r2.person_id   -- avoid duplicates and self-pairs
      JOIN Movies AS m
        ON r1.movie_id   = m.movie_id     -- filter by movie popularity
      JOIN People AS p1
        ON r1.person_id  = p1.person_id
      JOIN People AS p2
        ON r2.person_id  = p2.person_id
      WHERE r1.role IN ('actor', 'actress')
        AND r2.role IN ('actor', 'actress')
        AND m.num_votes >= 50000          -- only popular movies
      GROUP BY
          p1.person_id, p1.name,
          p2.person_id, p2.name
      HAVING
          COUNT(*) >= 3                   -- at least 3 popular movies together
      ORDER BY
          num_movies_together DESC,
          actor1_name,
          actor2_name
      LIMIT 10;
    `;

    const result = await pool.query(query);
    res.json(result.rows); // actor1_id, actor1_name, actor2_id, actor2_name, num_movies_together
  } catch (err) {
    console.error('Database error on /actors/frequent-pairs:', err);
    res.status(500).send('Database error');
  }
});


// Route 6 — High-Rated Known-For Filmographies (Complex Query X)
// GET /people/high-rated-knownfor
app.get('/people/high-rated-knownfor', async (req, res) => {
  const sql = `
    WITH person_stats AS (
      SELECT
        p.person_id,
        p.name,
        COUNT(*) AS num_known_for,
        AVG(m.rating) AS avg_rating,
        AVG(m.num_votes) AS avg_votes   -- average popularity of their known-for movies
      FROM people p
      JOIN person_known_for pk ON pk.person_id = p.person_id
      JOIN movies m ON m.movie_id = pk.movie_id
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
      AND avg_rating >= 8.5
      AND avg_votes >= 10000     -- popularity filter: adjust if needed
    ORDER BY avg_rating DESC, avg_votes DESC, name
    LIMIT 20;
`;

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /people/high-rated-knownfor:', err);
    res.status(500).send('Database error');
  }
});

// Route 7 — Most Prolific Actors/Actresses (Query 7)
// GET /actors/prolific
app.get('/actors/prolific', async (req, res) => {
  try {
    const query = `
      SELECT
          p.person_id,
          p.name,
          COUNT(*) AS num_acting_roles
      FROM People AS p
      JOIN Roles  AS r ON p.person_id = r.person_id
      WHERE r.role IN ('actor', 'actress')
      GROUP BY p.person_id, p.name
      ORDER BY num_acting_roles DESC
      LIMIT 20;
    `;

    const result = await pool.query(query);
    res.json(result.rows); // person_id, name, num_acting_roles
  } catch (err) {
    console.error('Database error on /actors/prolific:', err);
    res.status(500).send('Database error');
  }
});


// Route 8 — Best-Rated Movie per Decade (Complex Query 8)
// GET /movies/best-per-decade
app.get('/movies/best-per-decade', async (req, res) => {
  try {
    const query = `
      WITH popular AS (
          SELECT *
          FROM Movies
          WHERE release_year IS NOT NULL
            AND rating IS NOT NULL
            AND num_votes >= 10000      -- only popular movies
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
    `;

    const result = await pool.query(query);
    res.json(result.rows); // decade_start_year, movie_id, title, rating, num_votes
  } catch (err) {
    console.error('Database error on /movies/best-per-decade:', err);
    res.status(500).send('Database error');
  }
});


// Route 9 — Known-For Movies for a Given Person (Query 9)
// GET /people/:name/known-for
app.get('/people/:name/known-for', async (req, res) => {
  const { name } = req.params

  const sql = `
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
  `

  try {
    const result = await pool.query(sql, [name])
    res.json(result.rows)
  } catch (err) {
    console.error('Database error on /people/:name/known-for:', err)
    res.status(500).send('Database error')
  }
});


// Route 10 — Movies Tagged as Both Drama and Romance (Complex Query 10)
// GET /movies/genre/drama-romance
app.get('/movies/genre/drama-romance', async (req, res) => {
  try {
    const query = `
      SELECT
          m.movie_id,
          m.title,
          m.release_year,
          m.rating,
          m.num_votes
      FROM Movies AS m
      JOIN movie_genres mg1 ON m.movie_id = mg1.movie_id
      JOIN Genres      g1  ON mg1.genre_id = g1.genre_id
      JOIN movie_genres mg2 ON m.movie_id = mg2.movie_id
      JOIN Genres      g2  ON mg2.genre_id = g2.genre_id
      WHERE g1.genre_name = 'Drama'
        AND g2.genre_name = 'Romance'
        AND m.rating IS NOT NULL
        AND m.num_votes >= 10000        -- only popular movies
      ORDER BY m.rating DESC, m.num_votes DESC, m.title;
    `;

    const result = await pool.query(query);
    res.json(result.rows); // movie_id, title, release_year, rating, num_votes
  } catch (err) {
    console.error('Database error on /movies/genre/drama-romance:', err);
    res.status(500).send('Database error');
  }
});

// Cross Query 1 – High-budget movies with low IMDb ratings (IMDb + market_info)
app.get('/analytics/high-budget-low-rating', async (req, res) => {
  const sql = `
    SELECT
        m.movie_id,
        m.title,
        m.release_year,
        m.rating           AS imdb_rating,
        m.num_votes,
        mi.budget,
        mi.revenue,
        (mi.revenue - mi.budget) AS profit
    FROM market_info AS mi
    JOIN movies      AS m
      ON mi.imdb_id = m.movie_id
    WHERE
        mi.budget >= 100000000      -- big budget: >= 100M
        AND mi.revenue > 0
        AND m.num_votes >= 10000    -- only popular movies
        AND m.rating < 6.0          -- "low" IMDb rating
    ORDER BY
        m.rating ASC,               -- worst-rated first
        mi.budget DESC,
        m.num_votes DESC
    LIMIT 50;
  `;

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /analytics/high-budget-low-rating:', err);
    res.status(500).send('Database error');
  }
});



// Cross Query 2 – Highest-ROI movies (IMDb + market_info)
// ROI = (revenue - budget) / budget
app.get('/analytics/high-roi-movies', async (req, res) => {
  const sql = `
    SELECT
        m.movie_id,
        m.title,
        m.release_year,
        m.rating          AS imdb_rating,
        m.num_votes,
        mi.budget,
        mi.revenue,
        (mi.revenue - mi.budget) * 1.0 / NULLIF(mi.budget, 0) AS roi
    FROM market_info AS mi
    JOIN movies      AS m
      ON mi.imdb_id = m.movie_id
    WHERE
        mi.budget >= 10000              -- ignore fake/very tiny budgets
        AND mi.revenue > 0
        AND m.num_votes >= 10000        -- only popular movies
        AND mi.revenue >= mi.budget     -- at least non-negative profit
        AND m.rating >= 6.0
    ORDER BY
        roi DESC,
        m.num_votes DESC
    LIMIT 50;
  `;

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /analytics/high-roi-movies:', err);
    res.status(500).send('Database error');
  }
});


// Route 11 — Movie Details for Popup (Complex Query 11)
// GET /movies/:movieId/details
app.get('/movies/:movieId/details', async (req, res) => {
  const { movieId } = req.params;

  const sql = `  -- paste the SQL above here, with $1
    SELECT
      m.movie_id,
      m.title,
      m.release_year,
      m.runtime_minutes,
      m.rating,
      m.num_votes,
      mi.overview,
      mi.poster_path,
      ARRAY_AGG(DISTINCT c.country_name) FILTER (WHERE c.country_name IS NOT NULL) AS countries,
      ARRAY_AGG(DISTINCT g.genre_name) FILTER (WHERE g.genre_name IS NOT NULL) AS genres,
      ARRAY_AGG(DISTINCT p_dir.name)   FILTER (WHERE r.role = 'director')     AS directors,
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
  `;

  try {
    const result = await pool.query(sql, [movieId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const row = result.rows[0];

    res.json({
      movie_id: row.movie_id,
      title: row.title,
      release_year: row.release_year,
      runtime_minutes: row.runtime_minutes,
      rating: row.rating,
      num_votes: row.num_votes,
      overview: row.overview ?? undefined,
      poster_path: row.poster_path ?? undefined,
      genres: row.genres ?? [],
      directors: row.directors ?? [],
      cast: row.cast ?? [],
      countries: row.countries ?? []
    });
  } catch (err) {
    console.error('Error in /movies/:movieId/details:', err);
    res.status(500).send('Database error');
  }
});


// Route 12 — Hidden Gems (High Rating, Low Popularity) (Complex Query 12)
// GET /movies/hidden-gems
app.get('/movies/hidden-gems', async (req, res) => {
  const sql = `
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
  `;

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /movies/hidden-gems:', err);
    res.status(500).send('Database error');
  }
});


// start server
app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});

