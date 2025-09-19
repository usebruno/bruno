module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/__tests__/**/*.(js|ts)', '**/*.(test|spec).(js|ts)'],
  collectCoverageFrom: [
    'src/**/*.(js|ts)',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: [],
}; 