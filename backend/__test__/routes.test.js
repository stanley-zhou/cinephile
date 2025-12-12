const request = require("supertest");

// ---- mock pg Pool BEFORE importing app ----
const mockQuery = jest.fn();

jest.mock("pg", () => ({
  Pool: jest.fn(() => ({
    query: (...args) => mockQuery(...args),
  })),
}));

// Now import the Express app (must export app from index.js)
const app = require("../index");

const rows = (arr) => ({ rows: arr });

beforeEach(() => {
  mockQuery.mockReset();
});

describe("Backend route tests (mocked DB)", () => {
  test("GET / returns health text", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Backend is running");
  });

  // ---------------- DB Health ----------------
  test("GET /db-health success", async () => {
    mockQuery.mockResolvedValueOnce(rows([{ now: "2025-12-12T00:00:00Z" }]));
    const res = await request(app).get("/db-health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("now");
  });

  test("GET /db-health error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/db-health");
    expect(res.status).toBe(500);
  });

  // ---------------- Movies ----------------
  test("GET /movies/popular/high-rated success", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([
        {
          movie_id: "tt1",
          title: "A",
          release_year: 2000,
          rating: 9.1,
          num_votes: 20000,
        },
      ])
    );
    const res = await request(app).get("/movies/popular/high-rated");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("movie_id");
  });

  test("GET /movies/popular/high-rated error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/movies/popular/high-rated");
    expect(res.status).toBe(500);
  });

  test("GET /movies/:title/genres success", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([{ title: "Star", rating: 8.0, num_votes: 50000, genre_name: "Sci-Fi" }])
    );
    const res = await request(app).get("/movies/Star/genres");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /movies/:title/genres error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/movies/Star/genres");
    expect(res.status).toBe(500);
  });

  test("GET /movies/best-per-decade success", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([
        {
          decade_start_year: 1990,
          movie_id: "tt2",
          title: "B",
          rating: 9.0,
          num_votes: 100000,
        },
      ])
    );
    const res = await request(app).get("/movies/best-per-decade");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /movies/best-per-decade error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/movies/best-per-decade");
    expect(res.status).toBe(500);
  });

  test("GET /movies/genre/drama-romance success", async () => {
    mockQuery.mockResolvedValueOnce(rows([{ movie_id: "tt3", title: "C" }]));
    const res = await request(app).get("/movies/genre/drama-romance");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /movies/hidden-gems success", async () => {
    mockQuery.mockResolvedValueOnce(rows([{ movie_id: "tt4", title: "Gem" }]));
    const res = await request(app).get("/movies/hidden-gems");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Q15 (details) — cover 200, 404, 500 branches
  test("GET /movies/:movieId/details returns 404 when not found", async () => {
    mockQuery.mockResolvedValueOnce(rows([]));
    const res = await request(app).get("/movies/tt404/details");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /movies/:movieId/details success maps fields", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([
        {
          movie_id: "tt0317248",
          title: "Mean Girls",
          release_year: 2004,
          runtime_minutes: 97,
          rating: 7.1,
          num_votes: 500000,
          overview: null,
          poster_path: null,
          genres: ["Comedy"],
          directors: ["Mark Waters"],
          cast: ["Lindsay Lohan"],
          countries: ["United States"],
        },
      ])
    );

    const res = await request(app).get("/movies/tt0317248/details");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("movie_id", "tt0317248");
    expect(Array.isArray(res.body.genres)).toBe(true);
    expect(Array.isArray(res.body.directors)).toBe(true);
    expect(Array.isArray(res.body.cast)).toBe(true);
    expect(Array.isArray(res.body.countries)).toBe(true);
  });

  test("GET /movies/:movieId/details error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/movies/tt0317248/details");
    expect(res.status).toBe(500);
  });

  // Q16 (explore) — calls pool.query twice
  test("GET /movies/explore success (default params)", async () => {
    mockQuery
      .mockResolvedValueOnce(rows([{ movie_id: "tt5", title: "Star", genres: ["Sci-Fi"] }])) // rowsSql
      .mockResolvedValueOnce(rows([{ total: "1" }])); // totalSql

    const res = await request(app).get("/movies/explore");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("rows");
    expect(res.body).toHaveProperty("total");
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  test("GET /movies/explore covers sanitize branches (bad sort, big limit, negative offset)", async () => {
    mockQuery
      .mockResolvedValueOnce(rows([{ movie_id: "tt6", title: "X" }]))
      .mockResolvedValueOnce(rows([{ total: "1" }]));

    const res = await request(app).get("/movies/explore?search=star&sort=bad&limit=999&offset=-5");
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  test("GET /movies/explore uses valid sort key year_desc (search path)", async () => {
    mockQuery
      .mockResolvedValueOnce(rows([{ movie_id: "ttA", title: "A" }]))
      .mockResolvedValueOnce(rows([{ total: "1" }]));

    const res = await request(app).get("/movies/explore?search=star&sort=year_desc&limit=10&offset=0");
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(2);

    const firstCallSql = mockQuery.mock.calls[0][0];
    expect(firstCallSql).toContain("ORDER BY m.release_year DESC");
  });

  test("GET /movies/explore uses valid sort key votes_asc (no-search path)", async () => {
    mockQuery
      .mockResolvedValueOnce(rows([{ movie_id: "ttB", title: "B" }]))
      .mockResolvedValueOnce(rows([{ total: "1" }]));

    const res = await request(app).get("/movies/explore?sort=votes_asc&limit=10&offset=0");
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(2);

    const firstCallSql = mockQuery.mock.calls[0][0];
    expect(firstCallSql).toContain("ORDER BY m.num_votes ASC");
  });

  test("GET /movies/explore error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/movies/explore?search=star");
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });

  // ---------------- Genres analytics ----------------
  test("GET /genres/stats/ratings success", async () => {
    mockQuery.mockResolvedValueOnce(rows([{ genre_name: "Comedy", avg_rating: 7.2 }]));
    const res = await request(app).get("/genres/stats/ratings");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ---------------- Optimized endpoints ----------------
  test("GET /directors/above-average success", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([{ person_id: "nm1", name: "Dir", num_directed_popular_movies: "5", director_avg_rating: "8.9" }])
    );
    const res = await request(app).get("/directors/above-average");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /actors/prolific success", async () => {
    mockQuery.mockResolvedValueOnce(rows([{ person_id: "nm2", name: "Act", num_acting_roles: "999" }]));
    const res = await request(app).get("/actors/prolific");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /actors/prolific error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/actors/prolific");
    expect(res.status).toBe(500);
  });

  test("GET /actors/frequent-pairs success", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([
        {
          actor1_id: "nm3",
          actor1_name: "A",
          actor2_id: "nm4",
          actor2_name: "B",
          num_movies_together: 5,
        },
      ])
    );
    const res = await request(app).get("/actors/frequent-pairs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /people/high-rated-knownfor success (MV)", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([{ person_id: "nm5", name: "P", num_known_for: 3, avg_rating: 9.0, avg_votes: 20000 }])
    );
    const res = await request(app).get("/people/high-rated-knownfor");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /people/:name/known-for success", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([{ movie_id: "tt7", title: "KnownFor", release_year: 2010, rating: 8.8, num_votes: 100000 }])
    );
    const res = await request(app).get("/people/Somebody/known-for");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ---------------- Misc analytics ----------------
  test("GET /analytics/high-budget-low-rating success", async () => {
    mockQuery.mockResolvedValueOnce(rows([{ movie_id: "tt8", title: "BigBudget", profit: -123 }]));
    const res = await request(app).get("/analytics/high-budget-low-rating");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /analytics/high-roi-movies success", async () => {
    mockQuery.mockResolvedValueOnce(rows([{ movie_id: "tt9", title: "HighROI", roi: 10.5 }]));
    const res = await request(app).get("/analytics/high-roi-movies");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /analytics/country-stats success (sort=roi)", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([{ country_name: "US", num_movies: 100, avg_rating: 7.5, total_revenue: 123, avg_roi: 3.2 }])
    );
    const res = await request(app).get("/analytics/country-stats?sort=roi");
    expect(res.status).toBe(200);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain("ORDER BY avg_roi DESC");
  });

  test("GET /analytics/country-stats covers sort=revenue", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([{ country_name: "US", num_movies: 100, avg_rating: 7.5, total_revenue: 123, avg_roi: 3.2 }])
    );
    const res = await request(app).get("/analytics/country-stats?sort=revenue");
    expect(res.status).toBe(200);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain("ORDER BY total_revenue DESC");
  });

  test("GET /analytics/country-stats covers sort=movies", async () => {
    mockQuery.mockResolvedValueOnce(
      rows([{ country_name: "US", num_movies: 100, avg_rating: 7.5, total_revenue: 123, avg_roi: 3.2 }])
    );
    const res = await request(app).get("/analytics/country-stats?sort=movies");
    expect(res.status).toBe(200);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain("ORDER BY num_movies DESC");
  });

  test("GET /analytics/country-stats error branch", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db fail"));
    const res = await request(app).get("/analytics/country-stats?sort=rating");
    expect(res.status).toBe(500);
  });
});
