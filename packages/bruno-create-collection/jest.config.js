module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  "testEnvironment": "node",
  "collectCoverageFrom": [
    "src/**/*.js"
  ],
  "testPathIgnorePatterns": [
    "/node_modules/",
    "/coverage/"
  ],
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/coverage/"
  ],
  verbose: false,
  testTimeout: 10000,
  errorOnDeprecated: true,
  displayName: {
    name: "create-collection",
    color: "blue"
  }
}