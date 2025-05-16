module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid)/)'
  ],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^nanoid(/(.*)|$)': 'nanoid$1'
  }
};
