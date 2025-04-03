module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
