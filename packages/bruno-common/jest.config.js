/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'jest',
        outputName: 'results.xml'
      }
    ]
  ],
  collectCoverage: true,
  coverageReporters: [
    'text', 'cobertura'
  ],
  coverageDirectory: './coverage'
};
