module.exports = {
  transform: {
    '^.+\\.(ts|js)$': 'babel-jest',
  },
  testEnvironment: 'node',
  testTimeout: 50000
};
