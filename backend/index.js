const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL 
// PostgreSQL connection (using connection string)
const pool = new Pool({
  connectionString: 'postgresql://postgres:2156989@localhost:5432/postgres',
});


// test API
app.get('/', (req, res) => {
  res.send('Backend is running!');
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
        g.genre_name
      FROM Movies AS m
      JOIN MovieGenres AS mg ON m.movie_id = mg.movie_id
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
      JOIN MovieGenres AS mg ON g.genre_id = mg.genre_id
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


// Route 6 — People With All High-Rated Known-For Movies (Complex Query 6)
// GET /people/high-rated-knownfor
app.get('/people/high-rated-knownfor', async (req, res) => {
  try {
    const query = `
      SELECT
          p.person_id,
          p.name
      FROM People AS p
      WHERE EXISTS (   -- they have at least one known-for movie
          SELECT 1
          FROM PersonKnownFor pk
          WHERE pk.person_id = p.person_id
      )
      AND NOT EXISTS ( -- none of the known-for movies has rating < 8.0
          SELECT 1
          FROM PersonKnownFor pk
          JOIN Movies m ON pk.movie_id = m.movie_id
          WHERE pk.person_id = p.person_id
            AND m.rating < 8.0
      )
      ORDER BY p.name;
    `;

    const result = await pool.query(query);
    res.json(result.rows); // person_id, name
  } catch (err) {
    console.error('Database error on /people/high-rated-knownfor:', err);
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
  try {
    const { name } = req.params; // person name from URL

    const query = `
      SELECT
          p.person_id,
          p.name,
          m.movie_id,
          m.title,
          m.rating,
          m.num_votes
      FROM People AS p
      JOIN PersonKnownFor pk ON p.person_id = pk.person_id
      JOIN Movies         AS m  ON pk.movie_id = m.movie_id
      WHERE p.name = $1
      ORDER BY m.rating DESC, m.num_votes DESC;
    `;

    const result = await pool.query(query, [name]);
    res.json(result.rows); // person_id, name, movie_id, title, rating, num_votes
  } catch (err) {
    console.error('Database error on /people/:name/known-for:', err);
    res.status(500).send('Database error');
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
      JOIN MovieGenres mg1 ON m.movie_id = mg1.movie_id
      JOIN Genres      g1  ON mg1.genre_id = g1.genre_id
      JOIN MovieGenres mg2 ON m.movie_id = mg2.movie_id
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

// Cross Query 11 – High-budget movies with low IMDb ratings
// Path: GET /analytics/high-budget-low-rating
app.get('/analytics/high-budget-low-rating', async (req, res) => {
  const sql = `
    SELECT
        m.movie_id,
        m.title,
        m.release_year,
        m.rating           AS imdb_rating,
        m.num_votes,
        t.budget,
        t.revenue,
        (t.revenue - t.budget) AS profit
    FROM tmdb_movies AS t
    JOIN Movies       AS m
      ON t.imdb_id = m.movie_id
    WHERE
        t.budget >= 100000000      -- big budget: >= 100M
        AND t.revenue > 0
        AND m.num_votes >= 10000   -- only popular movies on IMDb
        AND m.rating < 6.0         -- low IMDb rating
    ORDER BY
        m.rating ASC,
        t.budget DESC,
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


// Cross Query 2 – Highest-ROI movies (IMDb + TMDb)
// ROI = (revenue - budget) / budget
// Path: GET /analytics/high-roi-movies
app.get('/analytics/high-roi-movies', async (req, res) => {
  const sql = `
    SELECT
        m.movie_id,
        m.title,
        m.release_year,
        m.rating          AS imdb_rating,
        m.num_votes,
        t.budget,
        t.revenue,
        (t.revenue - t.budget) * 1.0 / NULLIF(t.budget, 0) AS roi
    FROM tmdb_movies AS t
    JOIN Movies       AS m
      ON t.imdb_id = m.movie_id
    WHERE
        t.budget >= 10000              -- ignore fake/very tiny budgets
        AND t.revenue > 0
        AND m.num_votes >= 10000       -- only popular movies
        AND t.revenue >= t.budget      -- at least non-negative profit
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





// start
app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
