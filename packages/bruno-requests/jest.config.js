module.exports = {
  transform: {
    '^.+\\.(ts|js)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lodash-es)/)',
  ],
  testEnvironment: 'node',
  testMatch: [
    '**/*.(test|spec).(ts|js)'
  ],
  moduleFileExtensions: ['ts', 'js', 'json']
};