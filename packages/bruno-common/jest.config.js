module.exports = {
  transform: {
    '^.+\\.(ts|js)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lodash-es)/)',
  ],
  testEnvironment: 'node',
  testTimeout: 50000 // for playwright tests
};
