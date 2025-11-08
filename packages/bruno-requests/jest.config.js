module.exports = {
  transform: {
    '^.+\\.(ts|js)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(lodash-es|is-ip|ip-regex|super-regex|function-timeout|time-span|convert-hrtime|clone-regexp|is-regexp)/)'
  ],
  testEnvironment: 'node',
  testMatch: [
    '**/*.(test|spec).(ts|js)'
  ],
  moduleFileExtensions: ['ts', 'js', 'json']
};