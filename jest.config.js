/** @type {import('ts-jest').JestConfigWithTsJest} */
const reporters = ['default']

if (process.env.JEST_JUNIT_OUTPUT_NAME) {
  reporters.push([
    'jest-junit',
    {
      outputDirectory: 'reports/junit',
      outputName: process.env.JEST_JUNIT_OUTPUT_NAME,
      classNameTemplate: '{filepath}',
    },
  ])
}

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters,
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text-summary'],
  // Strip ".js" suffix from relative imports so ts-jest can resolve the
  // adjacent .ts sources. Source imports use ".js" extensions to satisfy
  // the dual native ESM + CJS tsc emit; this mapper keeps the test runner
  // (which executes .ts via ts-jest, not the built output) happy.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}
