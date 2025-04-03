module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  testEnvironment: "jest-environment-jsdom",
  testTimeout: 100000
};
