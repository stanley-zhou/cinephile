# CINEPHILE – IMDb × TMDb Movie Analytics Dashboard

Welcome to CINEPHILE! CINEPHILE is a full-stack movie analytics site which combines cleaned IMDb data with TMDb market information to let users:

- Discover **top-rated** and **hidden-gem** movies
- Explore **genres, directors, actors, and frequent co-star pairs**
- Analyze **box office performance**, **high-budget flops**, and **highest-ROI movies**
- Browse a **searchable + sortable movie library** with rich, on-demand details

The project has three main pieces:

1. **PostgreSQL on AWS RDS** – final schema, constraints, and all queries  
2. **Node.js + Express backend** (`backend/`) – REST API powered by SQL  
3. **React (Vite) frontend** (`frontend/`) – the CINEPHILE UI

---

## Project Structure

```text
CIS5500_Final_Project_Group15/
├── backend/
│   ├── index.js                 # Express server + all API routes
│   ├── package.json             # Backend dependencies/scripts
│   └── package-lock.json
│
├── frontend/
│   ├── index.html
│   ├── package.json             # Frontend dependencies/scripts (Vite + React)
│   ├── package-lock.json
│   └── src/
│       ├── App.jsx              # Main React SPA (all views + routing logic)
│       └── App.css              # Global styling & Explore table styles
│
├── docs/
│   ├── ER_diagram.drawio        # ER diagram source
│   ├── ER_diagram.drawio.pdf    # ER diagram (PDF)
│   ├── normalization_proof.tex  # 3NF / BCNF proof (LaTeX)
│   └── normalization_proof.pdf  # Normalization proof (PDF)
│
├── notebooks/
│   ├── 01_imdb_data_preprocessing.ipynb   # IMDb preprocessing pipeline
│   └── 02_tmdb_data_preprocessing.ipynb   # TMDb + MarketInfo preprocessing
│
├── sql/
│   ├── 01_aws_schema_and_load.sql         # Data loading scripts
│   └── 02_queries.sql                     # Saved SQL queries for the app
│
├── .gitignore
└── README.md

---

## 🚀 Deployment and Execution

### 💻 Current Architecture

* **Backend**
    * Node.js + Express app deployed as a **Render Web Service**.
    * Public base URL: `https://cinephile-backend-u7zh.onrender.com`
    * Connects to a shared **AWS RDS PostgreSQL** database (`imdb_db`).
* **Frontend**
    * React + Vite application located in `frontend/`.
    * The frontend is served locally during development and connects to the deployed backend for data access.

> **Note:** The backend service is configured as a **Web Service** on Render. Currently, only the backend is deployed; the frontend assets are served locally via Vite.

---

### 🟢 Suggested Execution Method: Local Frontend + Deployed Backend

This configuration is recommended for development, testing, and interaction with the live database.

1.  **Clone the repository and install frontend dependencies**

    ```bash
    git clone [https://github.com/stanley-zhou/CIS5500_Final_Project_Group15.git](https://github.com/stanley-zhou/CIS5500_Final_Project_Group15.git)
    cd CIS5500_Final_Project_Group15/frontend
    npm install
    ```

2.  **Configure API Base URL**

    Ensure the frontend is pointing to the deployed backend. In `frontend/src/App.jsx`, verify:

    ```javascript
    const API_BASE = '[https://cinephile-backend-u7zh.onrender.com](https://cinephile-backend-u7zh.onrender.com)'
    ```

3.  **Start the Frontend Application**

    ```bash
    npm run dev
    ```

    Open the Vite URL printed in the terminal (typically `http://localhost:5173`) in a browser. All data will be fetched from the deployed backend on Render.
