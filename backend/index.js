// index.js
// CIS 5500 Final Project backend – Express + PostgreSQL
// Exposes movie, people, and analytics routes for the IMDb + TMDb database.

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// Database connection
// ============================================================================
const pool = new Pool({
  host: process.env.PGHOST || 'cis5500finalproject.c3ai0u00ir5v.us-east-1.rds.amazonaws.com',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'group15',
  password: process.env.PGPASSWORD || 'Group15OfCIS5500!',
  database: process.env.PGDATABASE || 'imdb_db',
  ssl: { rejectUnauthorized: false }
});


// ============================================================================
// Health check routes
// ============================================================================

/**
 * GET /
 * Simple health check for the Express server.
 */
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

/**
 * GET /db-health
 * Quick DB connectivity check – returns NOW() from Postgres.
 */
app.get('/db-health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB health check failed:', err);
    res.status(500).send('DB connection error');
  }
});

// ============================================================================
// Movie routes
// ============================================================================

/**
 * GET /movies/popular/high-rated
 * Top 20 high-rated movies with at least 10,000 votes.
 */
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

/**
 * GET /movies/:title/genres
 * Genres and basic stats for a given movie title.
 */
app.get('/movies/:title/genres', async (req, res) => {
  try {
    const { title } = req.params;

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

/**
 * GET /movies/best-per-decade
 * Best popular movie (by rating, then votes) per decade.
 */
app.get('/movies/best-per-decade', async (req, res) => {
  try {
    const query = `
      WITH popular AS (
          SELECT *
          FROM Movies
          WHERE release_year IS NOT NULL
            AND rating IS NOT NULL
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
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /movies/best-per-decade:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /movies/genre/drama-romance
 * Movies tagged as both Drama and Romance with decent popularity.
 */
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
        AND m.num_votes >= 10000
      ORDER BY m.rating DESC, m.num_votes DESC, m.title;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /movies/genre/drama-romance:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /movies/hidden-gems
 * High-rated but relatively low-vote movies (“hidden gems”).
 */
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

/**
 * GET /movies/:movieId/details
 * Detailed movie info (overview, genres, directors, cast, countries) for modal.
 */
app.get('/movies/:movieId/details', async (req, res) => {
  const { movieId } = req.params;

  const sql = `
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
      ARRAY_AGG(DISTINCT g.genre_name)   FILTER (WHERE g.genre_name IS NOT NULL)   AS genres,
      ARRAY_AGG(DISTINCT p_dir.name)     FILTER (WHERE r.role = 'director')       AS directors,
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
      countries: row.countries ?? [],
    });
  } catch (err) {
    console.error('Error in /movies/:movieId/details:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /movies/explore
 * Paginated, sortable movie list for the “Browse All Movies” table.
 */
app.get('/movies/explore', async (req, res) => {
  try {
    const {
      search = '',
      sort = 'rating_desc',
      limit = '25',
      offset = '0',
    } = req.query;

    const searchTerm = search.trim();

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);

    const sortMap = {
      year_desc: 'm.release_year DESC NULLS LAST',
      year_asc: 'm.release_year ASC  NULLS LAST',
      runtime_desc: 'm.runtime_minutes DESC NULLS LAST',
      runtime_asc: 'm.runtime_minutes ASC  NULLS LAST',
      rating_desc: 'm.rating DESC   NULLS LAST',
      rating_asc: 'm.rating ASC    NULLS LAST',
      votes_desc: 'm.num_votes DESC     NULLS LAST',
      votes_asc: 'm.num_votes ASC      NULLS LAST',
    };

    const orderBy = sortMap[sort] || sortMap.rating_desc;

    const values = [];
    const whereClauses = [];

    if (searchTerm) {
      values.push(`%${searchTerm.toLowerCase()}%`);
      whereClauses.push(`LOWER(m.title) LIKE $${values.length}`);
    } else {
      whereClauses.push('m.num_votes >= 1000');
      whereClauses.push('m.rating IS NOT NULL');
    }

    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const baseFrom = `
      FROM movies m
      LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN genres g       ON mg.genre_id = g.genre_id
      ${whereSql}
    `;

    values.push(limitNum, offsetNum);

    const rowsSql = `
      SELECT
        m.movie_id,
        m.title,
        m.release_year,
        m.runtime_minutes,
        m.rating,
        m.num_votes,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT g.genre_name), NULL) AS genres
      ${baseFrom}
      GROUP BY
        m.movie_id,
        m.title,
        m.release_year,
        m.runtime_minutes,
        m.rating,
        m.num_votes
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length};
    `;

    const totalSql = `
      SELECT COUNT(DISTINCT m.movie_id) AS total
      ${baseFrom};
    `;

    const [rowsResult, totalResult] = await Promise.all([
      pool.query(rowsSql, values),
      pool.query(totalSql, values.slice(0, values.length - 2)),
    ]);

    const rows = rowsResult.rows;
    const total = Number(totalResult.rows[0].total) || 0;

    res.json({ rows, total });
  } catch (err) {
    console.error('Error on /movies/explore:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Genre and people routes
// ============================================================================

/**
 * GET /genres/stats/ratings
 * Average rating and movie count for each genre (popular movies only).
 */
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
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /genres/stats/ratings:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /directors/above-average
 * Directors whose average rating is well above the global average.
 */
app.get('/directors/above-average', async (req, res) => {
  try {
    const query = `
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
      FROM movies m
      JOIN roles  r ON r.movie_id = m.movie_id
      JOIN people p ON p.person_id = r.person_id
      WHERE r.role = 'director'
        AND m.num_votes >= 10000
      GROUP BY p.person_id, p.name
      HAVING COUNT(*) >= 5
        AND AVG(m.rating) >= (SELECT avg_rating FROM global_avg)
      ORDER BY
        director_avg_rating DESC,
        num_directed_popular_movies DESC,
        p.name;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /directors/above-average:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /actors/prolific
 * Actors/actresses with the highest number of acting roles.
 */
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
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /actors/prolific:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /actors/frequent-pairs
 * Actor/actress pairs who have co-starred in at least 3 popular movies.
 */
app.get('/actors/frequent-pairs', async (req, res) => {
  try {
    const query = `
      WITH popular_movies AS (
        SELECT movie_id
        FROM movies
        WHERE num_votes >= 50000
      ),
      movie_cast AS (
        SELECT pm.movie_id, r.person_id
        FROM popular_movies pm
        JOIN roles r
          ON r.movie_id = pm.movie_id
        AND r.role IN ('actor', 'actress')
      ),
      pair_counts AS (
        SELECT
          c1.person_id AS actor1_id,
          c2.person_id AS actor2_id,
          COUNT(*) AS num_movies_together
        FROM movie_cast c1
        JOIN movie_cast c2
          ON c1.movie_id = c2.movie_id
        AND c1.person_id < c2.person_id
        GROUP BY c1.person_id, c2.person_id
        HAVING COUNT(*) >= 3
        ORDER BY num_movies_together DESC
        LIMIT 10
      )
      SELECT
        p1.person_id AS actor1_id, p1.name AS actor1_name,
        p2.person_id AS actor2_id, p2.name AS actor2_name,
        pc.num_movies_together
      FROM pair_counts pc
      JOIN people p1 ON p1.person_id = pc.actor1_id
      JOIN people p2 ON p2.person_id = pc.actor2_id
      ORDER BY pc.num_movies_together DESC, actor1_name, actor2_name;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /actors/frequent-pairs:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /people/high-rated-knownfor
 * People whose known-for movies are consistently highly rated.
 */
app.get('/people/high-rated-knownfor', async (req, res) => {
    const sql = `
      SELECT
        p.person_id,
        p.name,
        s.num_known_for,
        s.avg_rating,
        s.avg_votes
      FROM person_known_for_stats s
      JOIN people p ON p.person_id = s.person_id
      WHERE s.num_known_for >= 2
        AND s.avg_rating >= 8.5
        AND s.avg_votes >= 10000
      ORDER BY s.avg_rating DESC, s.avg_votes DESC, p.name
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

/**
 * GET /people/:name/known-for
 * Known-for movies for a given person name.
 */
app.get('/people/:name/known-for', async (req, res) => {
  const { name } = req.params;

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
  `;

  try {
    const result = await pool.query(sql, [name]);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error on /people/:name/known-for:', err);
    res.status(500).send('Database error');
  }
});

// ============================================================================
// Analytics routes (budget / revenue / country-level)
// ============================================================================

/**
 * GET /analytics/high-budget-low-rating
 * High-budget movies with low IMDb ratings and weak profits.
 */
app.get('/analytics/high-budget-low-rating', async (req, res) => {
  const sql = `
    SELECT
      m.movie_id,
      m.title,
      m.release_year,
      m.rating AS imdb_rating,
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
      AND mi.budget >= 60000000
      AND m.rating <= 5.5
      AND m.num_votes >= 20000
      AND mi.revenue < mi.budget * 1.1
    ORDER BY
      profit ASC,
      m.rating ASC,
      m.num_votes DESC
    LIMIT 20;
  `;

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /analytics/high-budget-low-rating:', err);
    res.status(500).send('Database error');
  }
});

/**
 * GET /analytics/high-roi-movies
 * Movies with the highest return on investment (ROI).
 */
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
        mi.budget >= 10000
        AND mi.revenue > 0
        AND m.num_votes >= 10000
        AND mi.revenue >= mi.budget
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

/**
 * GET /analytics/country-stats?sort=rating|revenue|roi|movies
 * Country-level stats: number of movies, avg rating, total revenue, avg ROI.
 */
app.get('/analytics/country-stats', async (req, res) => {
  const { sort } = req.query;

  let orderBy;
  switch (sort) {
    case 'revenue':
      orderBy = 'total_revenue DESC, avg_rating DESC';
      break;
    case 'roi':
      orderBy = 'avg_roi DESC, avg_rating DESC';
      break;
    case 'movies':
      orderBy = 'num_movies DESC, avg_rating DESC';
      break;
    case 'rating':
    default:
      orderBy = 'avg_rating DESC, total_revenue DESC';
      break;
  }

  const sql = `
    WITH popular_movies AS (
      SELECT movie_id, rating
      FROM movies
      WHERE num_votes >= 20000
    ),
    m_join AS (
      SELECT
        pm.movie_id,
        pm.rating,
        mi.tmdb_id,
        mi.revenue,
        mi.budget
      FROM popular_movies pm
      JOIN market_info mi
        ON mi.imdb_id = pm.movie_id
      WHERE mi.revenue IS NOT NULL
    )
    SELECT
      c.country_name,
      COUNT(*) AS num_movies,
      AVG(mj.rating) AS avg_rating,
      SUM(mj.revenue) AS total_revenue,
      AVG(
        CASE
          WHEN mj.budget IS NOT NULL AND mj.budget > 0
          THEN mj.revenue::numeric / mj.budget
          ELSE NULL
        END
      ) AS avg_roi
    FROM m_join mj
    JOIN movie_production_countries mpc
      ON mpc.tmdb_id = mj.tmdb_id
    JOIN countries c
      ON c.country_name = mpc.country_name
    GROUP BY c.country_name
    HAVING COUNT(*) >= 15
    ORDER BY ${orderBy}
    LIMIT 20;
  `;

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /analytics/country-stats:', err);
    res.status(500).send('Database error');
  }
});

// ============================================================================
// Server startup
// ============================================================================

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;



