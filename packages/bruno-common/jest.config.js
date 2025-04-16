// jest.config.js
module.exports = {
  transform: {
    '^.+\\.(ts|js)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lodash-es)/)',
  ],
  testEnvironment: 'node'
};
