module.exports = {
  rootDir: '.',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    "/node_modules/(?!strip-json-comments|nanoid|xml-formatter)/",
  ],
  moduleNameMapper: {
    '^assets/(.*)$': '<rootDir>/src/assets/$1',
    '^components/(.*)$': '<rootDir>/src/components/$1',
    '^hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^themes/(.*)$': '<rootDir>/src/themes/$1',
    '^api/(.*)$': '<rootDir>/src/api/$1',
    '^pageComponents/(.*)$': '<rootDir>/src/pageComponents/$1',
    '^providers/(.*)$': '<rootDir>/src/providers/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^test-utils/(.*)$': '<rootDir>/src/test-utils/$1'
  },
  clearMocks: true,
  moduleDirectories: ['node_modules', 'src'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  setupFiles: [
    '<rootDir>/jest.setup.js',
  ],
  testMatch: [
    '<rootDir>/src/**/*.spec.[jt]s?(x)'
  ]
};