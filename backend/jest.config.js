module.exports = {
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: ["index.js"],
  coverageReporters: ["text-summary", "lcov"],
  coverageThreshold: {
    global: {
      lines: 0.80,
      statements: 0.80,
      functions: 0.80,
      branches: 0.70
    }
  }
};
