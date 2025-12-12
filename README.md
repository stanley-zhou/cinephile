# CINEPHILE — Movie Discovery & Analytics (IMDb + TMDb)

Cinephile is a full-stack web app that combines **IMDb title/people/ratings** with **TMDb market + metadata** to support movie discovery (search/sort/browse), rich movie detail pages (cast/directors/genres/countries/overview), and analytics views (ROI, country stats, elite directors, etc.).

Live site:
- https://cis5500-final-project-group15.onrender.com/

---

## Repository Structure

```
.
├── sql/
│   ├── 01_aws_schema_and_load.sql       
│   ├── 02_queries.sql                   
│   └── 03_query_optimization.sql        
│
├── backend/
│   ├── index.js                       
│   ├── __tests__/                      
│   ├── jest.config.js
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── README.md
│
├── notebooks/
│   ├── 01_imdb_data_preprocessing.ipynb
│   └── 02_tmdb_data_preprocessing.ipynb
│
└── docs/
    ├── ER_diagram.drawio.pdf
    └── normalization_proof.tex
```

---

## Key Features (Clear, UI-facing)

### Movie Discovery
- **Explore Movies**: search by title, sort (rating/votes/year/runtime), paginate results, and view genres per movie.
- **Hidden Gems**: find high-rated movies with relatively low vote counts.
- **Best Movie per Decade**: top popular movie for each decade using window ranking.

### Movie Details (Modal)
- **One-click Details**: overview + poster (TMDb), plus **genres, directors, countries**, and **top cast** (derived from roles).

### People Insights
- **Elite Directors**: directors whose average rating on popular movies exceeds the global average.
- **Prolific Actors**: actors/actresses with the highest number of acting roles.
- **Frequent Co-stars**: actor pairs who co-appear frequently in popular movies.
- **High-Rated Known-For People**: people whose “known-for” titles have consistently high ratings/votes.

### Financial / Country Analytics (TMDb + IMDb)
- **High ROI Movies**: best return on investment using TMDb revenue/budget joined to IMDb popularity filters.
- **High Budget, Low Rating**: identify expensive underperformers.
- **Country Spotlight**: country-level aggregates (movie count, avg rating, total revenue, avg ROI) with flexible sorting.

---

## How to Use

### Option A — Use the deployed app (no AWS setup needed)
Just open:
- https://cis5500-final-project-group15.onrender.com/

Everything is already deployed (frontend + backend). You do **not** need AWS credentials or database access for usage.

### Option B — Run locally (you DO need access to the AWS RDS database)
If you want to run the backend locally against the AWS-hosted Postgres database, your machine must be able to connect to the RDS instance.

#### 1) Database access requirement (AWS RDS)
- Ensure the RDS **security group allows inbound Postgres (5432)** from your IP address.
- You will need the DB host/user/password/dbname (stored in backend `.env`).

#### 2) Backend
```bash
cd backend
npm install
npm start
```

Backend environment variables (in `backend/.env`):
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PORT`

Run tests + coverage:
```bash
npm test
npm run test:cov
```

#### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

If your frontend is configured to call the deployed backend by default, update the API base URL (if needed) to point to:
- local backend: `http://localhost:3001`
- deployed backend: `https://cis5500-final-project-group15.onrender.com`

---

## Documentation
- ER diagram: `docs/ER_diagram.drawio.pdf`
- Normalization proof: `docs/normalization_proof.tex`
- Data preprocessing notebooks: `notebooks/`
- SQL schema + queries + optimizations: `sql/`
