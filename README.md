# CIS 5500 Final Project – ()

This project builds a **normalized PostgreSQL database** on AWS RDS using cleaned data from the IMDb datasets.  
The database is designed to support a movie exploration / recommendation web app and to demonstrate **proper data cleaning, entity resolution, ER design, and 3NF/BCNF normalization**.

---

## Project Overview

### Data Source

We use a subset of the public IMDb datasets (title.basics, title.ratings, title.principals, name.basics).  
From these we construct a clean, consistent universe of **movies**, **people**, and their **roles**.

### Final Relational Schema

All tables live in the `public` schema of the `imdb_db` PostgreSQL database.

- **Movies**  
  `Movies(movie_id, title, release_year, runtime_minutes, is_adult, rating, num_votes)`  
  - **PK:** `movie_id` (IMDb tconst)  

- **Genres**  
  `Genres(genre_id, genre_name)`  
  - **PK:** `genre_id`  
  - `genre_name` is unique  

- **MovieGenres** – bridge between movies and genres  
  `MovieGenres(movie_id, genre_id)`  
  - **PK:** (`movie_id`, `genre_id`)  
  - **FKs:**  
    - `movie_id → Movies(movie_id)`  
    - `genre_id → Genres(genre_id)`

- **People**  
  `People(person_id, name, birth_year, death_year)`  
  - **PK:** `person_id` (IMDb nconst)

- **Roles** – bridge capturing who did what on each movie  
  `Roles(movie_id, person_id, role)`  
  - **PK:** (`movie_id`, `person_id`, `role`)  
  - **FKs:**  
    - `movie_id → Movies(movie_id)`  
    - `person_id → People(person_id)`  
  - Each row = one specific role (director / writer / actor / actress, etc.) that a person has in a movie.

- **PersonKnownFor** – IMDb “known for” relationships  
  `PersonKnownFor(person_id, movie_id)`  
  - **PK:** (`person_id`, `movie_id`)  
  - **FKs:**  
    - `person_id → People(person_id)`  
    - `movie_id → Movies(movie_id)`

The schema is proved to satisfy **BCNF** (and hence 3NF); see `docs/normalization_proof.tex`.

---

## Repository Structure

```text
.
├─ README.md
├─ notebooks/
│   └─ 01_imdb_data_preprocessing.ipynb
├─ sql/
│   ├─ 01_schema_ddl.sql
│   └─ 02_sample_queries.sql
├─ data/
│   ├─ cleaned/
│   │   ├─ movies.csv
│   │   ├─ genres.csv
│   │   ├─ movie_genres.csv
│   │   ├─ people.csv
│   │   ├─ roles.csv
│   │   └─ person_known_for.csv
│   └─ raw/
│       └─ README.md   # explains how to download raw IMDb TSVs (not stored in repo)
├─ docs/
│   ├─ er_diagram.tex
│   ├─ er_diagram.pdf
│   └─ normalization_proof.tex
└─ app/                # (optional) web app code, if implemented
