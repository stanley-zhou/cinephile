# Frontend — CINEPHILE (React + Vite)

This folder contains the React frontend for the Cinephile project. It provides an interactive UI for exploring movies, viewing details, and running analytics backed by the Express + PostgreSQL API.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

The dev server will print a local URL (commonly `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview
```

## Backend API

The frontend calls the backend REST API for all data. Make sure the backend is running locally (or set your deployed API base URL).

Typical API routes used by the UI include:

- `GET /movies/explore` — Browse all movies (search + sort + pagination)
- `GET /movies/:movieId/details` — Movie modal details (overview, cast, genres, countries, directors)
- `GET /movies/popular/high-rated` — Popular high-rated movies
- `GET /movies/best-per-decade` — Best movie per decade
- `GET /movies/hidden-gems` — Hidden gem movies
- `GET /genres/stats/ratings` — Genre rating statistics
- `GET /directors/above-average` — Elite / above-average directors
- `GET /actors/prolific` — Prolific actors/actresses
- `GET /actors/frequent-pairs` — Frequent co-star pairs
- `GET /people/high-rated-knownfor` — High-rated known-for people
- `GET /people/:name/known-for` — Known-for titles for a person
- `GET /analytics/high-budget-low-rating` — High-budget, low-rating underperformers
- `GET /analytics/high-roi-movies` — Highest ROI movies
- `GET /analytics/country-stats` — Country-level stats (rating / revenue / ROI / count)

## Pages / Features (High level)

The UI includes:
- Movie discovery features (search, sort, explore table)
- A movie details modal with richer joins (cast, directors, genres, countries, overview/poster when available)
- Analytics views (ROI, budget vs rating, country spotlight, genre stats)
- People/credits views (directors, prolific actors, frequent co-star pairs, known-for lists)

## Deployment

The frontend is deployed as a static site (built output) on Render and communicates with the deployed backend API.

Live site:
- https://cis5500-final-project-group15.onrender.com/

## Notes
- This folder contains only frontend code; no data is stored here.
- If you change the backend URL (local vs deployed), update the API base URL in the frontend configuration accordingly.
