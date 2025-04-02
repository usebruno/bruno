module.exports = {
  rootDir: '.',
  clearMocks: true,
  moduleDirectories: ['node_modules', 'src'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^utils/(.*)$': '<rootDir>/src/utils/$1'
  },
};
