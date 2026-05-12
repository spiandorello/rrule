/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      statements: 89,
      branches: 81,
      lines: 89,
      functions: 92,
    },
  },
}
