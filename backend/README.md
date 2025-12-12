# Backend — CINEPHILE API (Express + PostgreSQL)

This folder contains the Node.js + Express backend for the Cinephile project. It connects to a PostgreSQL database (IMDb + TMDb integrated schema) and exposes REST endpoints consumed by the React frontend.

## Run locally

```bash
cd backend
npm install
npm start
```

The server runs on `PORT` (defaults to `3001`).

## Environment variables

Configure your database connection via:

- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PORT`

## Testing

```bash
npm test
npm run test:cov
```

## API Overview

### Health
- `GET /` — Server health check
- `GET /db-health` — Database connectivity check

### Movies
- `GET /movies/popular/high-rated` — Popular, high-rated movies
- `GET /movies/:title/genres` — Genres for an exact movie title
- `GET /movies/best-per-decade` — Best popular movie per decade
- `GET /movies/genre/drama-romance` — Movies tagged as both Drama and Romance
- `GET /movies/hidden-gems` — High-rated, lower-vote “hidden gem” movies
- `GET /movies/:movieId/details` — Detailed movie info for the modal (overview, genres, cast, directors, countries)
- `GET /movies/explore` — Paginated browse endpoint (search + sort + pagination)

### Genres & People
- `GET /genres/stats/ratings` — Genre-level rating statistics (popular movies)
- `GET /directors/above-average` — Directors whose popular-movie average beats global average
- `GET /actors/prolific` — Most prolific actors/actresses
- `GET /actors/frequent-pairs` — Frequent co-star pairs in popular movies
- `GET /people/high-rated-knownfor` — People with consistently high-rated “known-for” portfolios
- `GET /people/:name/known-for` — Known-for movies for a person name

### Analytics (Budget / Revenue / Country)
- `GET /analytics/high-budget-low-rating` — High-budget, low-rating underperformers
- `GET /analytics/high-roi-movies` — Highest ROI movies (revenue vs budget)
- `GET /analytics/country-stats` — Country-level aggregates (movies, rating, revenue, ROI)

---
