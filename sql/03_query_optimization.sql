/* ============================================================================
   CINEPHILE — Query Optimization Artifacts (Indexes + Caching)
   Run AFTER schema + data load.

   Includes:
     - Indexing: btree / partial / covering / trigram GIN indexes
     - Caching : materialized view for Q6 (known-for stats)

   Notes:
     - All CREATE statements are idempotent (IF NOT EXISTS).
     - For best plans after creating indexes/MVs, run ANALYZE (or VACUUM ANALYZE).
============================================================================ */

BEGIN;

-- 0) Extensions --------------------------------------------------------------
-- Needed for fast substring search in Q16: LOWER(title) LIKE '%term%'
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) MOVIES -----------------------------------------------------------------
-- Vote threshold filters (Q4/Q5/Q14)
CREATE INDEX IF NOT EXISTS idx_movies_num_votes_desc
  ON movies (num_votes DESC);

-- Help Q4 global average (num_votes filter + rating read) with index-only scans
CREATE INDEX IF NOT EXISTS idx_movies_num_votes_include_rating
  ON movies (num_votes)
  INCLUDE (rating);

-- Sorting / pagination variants (Q16; also useful elsewhere)
CREATE INDEX IF NOT EXISTS idx_movies_rating_votes
  ON movies (rating DESC, num_votes DESC);

CREATE INDEX IF NOT EXISTS idx_movies_year
  ON movies (release_year);

CREATE INDEX IF NOT EXISTS idx_movies_runtime
  ON movies (runtime_minutes);

-- Trigram index for substring search (Q16)
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm
  ON movies
  USING GIN (LOWER(title) gin_trgm_ops);

-- 2) ROLES ------------------------------------------------------------------
-- Directors: join by movie_id and fetch person_id quickly (Q4/Q15)
CREATE INDEX IF NOT EXISTS idx_roles_director_movie_person
  ON roles (movie_id, person_id)
  WHERE role = 'director';

-- Acting cast: “all actors/actresses in a movie” (Q5/Q15)
CREATE INDEX IF NOT EXISTS idx_roles_acting_movie_person
  ON roles (movie_id, person_id)
  WHERE role IN ('actor', 'actress');

-- Reverse direction for “credits per person” (Q15 top-cast subquery)
CREATE INDEX IF NOT EXISTS idx_roles_acting_person_movie
  ON roles (person_id, movie_id)
  WHERE role IN ('actor', 'actress');

-- 3) MOVIE_GENRES / GENRES --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_movie_genres_movie_genre
  ON movie_genres (movie_id, genre_id);

CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_movie
  ON movie_genres (genre_id, movie_id);

CREATE INDEX IF NOT EXISTS idx_genres_name_lower
  ON genres ((LOWER(genre_name)));

-- 4) PEOPLE -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_people_name_lower
  ON people ((LOWER(name)));

-- 5) MARKET_INFO / COUNTRIES / PRODUCTION COUNTRIES -------------------------
-- Join market_info by imdb_id is common (Q14/Q15)
CREATE INDEX IF NOT EXISTS idx_market_info_imdb_id
  ON market_info (imdb_id);

-- Covering partial index for Q14: revenue IS NOT NULL scan becomes (almost) index-only
CREATE INDEX IF NOT EXISTS idx_market_info_revenue_notnull_cover
  ON market_info (revenue)
  INCLUDE (imdb_id, tmdb_id, budget)
  WHERE revenue IS NOT NULL;

-- Optional: speeds merges/grouping by country_name
CREATE INDEX IF NOT EXISTS idx_mpc_country_tmdb
  ON movie_production_countries (country_name, tmdb_id);

-- 6) CACHING (Q6) ------------------------------------------------------------
-- Pre-aggregate person-known-for stats once, then query is a fast filter + sort.
CREATE MATERIALIZED VIEW IF NOT EXISTS person_known_for_stats AS
SELECT
  pk.person_id,
  COUNT(*)         AS num_known_for,
  AVG(m.rating)    AS avg_rating,
  AVG(m.num_votes) AS avg_votes
FROM person_known_for pk
JOIN movies m ON m.movie_id = pk.movie_id
GROUP BY pk.person_id;

CREATE UNIQUE INDEX IF NOT EXISTS person_known_for_stats_pid
  ON person_known_for_stats(person_id);

COMMIT;

-- Post-build stats (recommended after bulk load/index creation)
VACUUM (ANALYZE) movies;
VACUUM (ANALYZE) roles;
VACUUM (ANALYZE) people;
VACUUM (ANALYZE) market_info;
VACUUM (ANALYZE) movie_genres;
VACUUM (ANALYZE) person_known_for;

-- If underlying data changes, refresh cached stats:
--   REFRESH MATERIALIZED VIEW person_known_for_stats;
