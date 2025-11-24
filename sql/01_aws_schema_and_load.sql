DROP TABLE IF EXISTS person_known_for;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS movie_genres;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS movies;

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

