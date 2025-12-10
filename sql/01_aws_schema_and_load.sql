DROP TABLE IF EXISTS person_known_for;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS movie_genres;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS movie_production_countries  CASCADE;
DROP TABLE IF EXISTS countries                 CASCADE;
DROP TABLE IF EXISTS market_info                CASCADE;

CREATE TABLE movies (
                        movie_id        VARCHAR(20) PRIMARY KEY,
                        title           TEXT NOT NULL,
                        release_year    INT,
                        runtime_minutes INT,
                        is_adult        BOOLEAN,
                        rating          NUMERIC(3,1),
                        num_votes       INT
);

CREATE TABLE genres (
                        genre_id    INT PRIMARY KEY,
                        genre_name  TEXT NOT NULL UNIQUE
);

CREATE TABLE movie_genres (
                              movie_id    VARCHAR(20) NOT NULL,
                              genre_id    INT NOT NULL,
                              PRIMARY KEY (movie_id, genre_id),
                              FOREIGN KEY (movie_id) REFERENCES movies(movie_id),
                              FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
);

CREATE TABLE people (
                        person_id   VARCHAR(20) PRIMARY KEY,
                        name        TEXT NOT NULL,
                        birth_year  INT,
                        death_year  INT
);

CREATE TABLE roles (
                       movie_id    VARCHAR(20) NOT NULL,
                       person_id   VARCHAR(20) NOT NULL,
                       role        TEXT NOT NULL,
                       PRIMARY KEY (movie_id, person_id, role),
                       FOREIGN KEY (movie_id) REFERENCES movies(movie_id),
                       FOREIGN KEY (person_id) REFERENCES people(person_id)
);

CREATE TABLE person_known_for (
                                  person_id   VARCHAR(20) NOT NULL,
                                  movie_id    VARCHAR(20) NOT NULL,
                                  PRIMARY KEY (person_id, movie_id),
                                  FOREIGN KEY (person_id) REFERENCES people(person_id),
                                  FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
);

CREATE TABLE market_info (
                            tmdb_id      INTEGER       PRIMARY KEY,
                            imdb_id      VARCHAR(20)   NOT NULL,
                            budget       NUMERIC(15,2),
                            revenue      NUMERIC(15,2),
                            popularity   NUMERIC(10,2),
                            overview     TEXT,
                            poster_path  TEXT,
                            FOREIGN KEY (imdb_id) REFERENCES movies(movie_id)
);

CREATE TABLE countries (
                           country_name  TEXT PRIMARY KEY
);


CREATE TABLE movie_production_countries (
                                          tmdb_id      INTEGER  NOT NULL,
                                          country_name TEXT     NOT NULL,
                                          PRIMARY KEY (tmdb_id, country_name),
                                          FOREIGN KEY (tmdb_id) REFERENCES market_info(tmdb_id),
                                          FOREIGN KEY (country_name) REFERENCES countries(country_name)
);
