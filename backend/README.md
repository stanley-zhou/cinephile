
---

## `backend/README.md`

```markdown
# Backend – CINEPHILE API

This folder contains the **Node.js + Express** backend for the CINEPHILE project.

## Files

- `index.js` – main entrypoint  
  - Sets up the Express app and CORS  
  - Creates a `pg.Pool` connection to the course AWS RDS PostgreSQL instance  
  - Defines all REST endpoints used by the React frontend
- `package.json` / `package-lock.json` – list of backend dependencies and scripts

## Dependencies

See `package.json` for exact versions. Main libraries:

- `express` – HTTP server and routing
- `cors` – Cross-origin resource sharing for the React frontend
- `pg` – PostgreSQL client

## Running the Backend Locally

```bash
cd backend
npm install
node index.js

## Key Routes:

Discover

`GET /movies/popular/high-rated – top-rated popular films`

`GET /movies/best-per-decade – best movie per decade (rating + votes)`

`GET /movies/hidden-gems – high rating but low vote-count “hidden gems”`

People

`GET /directors/above-average – directors whose popular filmography beats the global avg`

`GET /actors/prolific – most prolific actors/actresses`

`GET /actors/frequent-pairs – actor pairs who frequently co-star`

`GET /people/high-rated-knownfor – people with high-rated “known for” portfolios`

`GET /people/:name/known-for – known-for filmography for a given person name`

Analytics

`GET /genres/stats/ratings – average rating & count per genre`

`GET /analytics/high-budget-low-rating – high-budget movies with low IMDb ratings`

`GET /analytics/high-roi-movies – best ROI movies using budget & revenue`

`GET /analytics/country-stats?sort=rating|revenue|roi|movies – production country spotlight`

Movie-level

`GET /movies/:title/genres – all genres for a given movie title`

`GET /movies/:movieId/details – detail view for modal (genres, countries, cast, overview, etc.)`

`GET /movies/explore – main “Browse All Movies” table`

`search – substring match on lower-cased movie title`

`sort – one of rating_desc, rating_asc, year_desc, year_asc, runtime_asc, runtime_desc, votes_asc, votes_desc`
