module.exports = {
  moduleFileExtensions: [
    "js",
    "json",
    "ts"
  ],
  rootDir: ".",
  preset: 'ts-jest',
  testRegex: ".*\.spec\.ts$",
  transform: {
    "^.+\.(t|j)s$": "ts-jest"
  },
  collectCoverageFrom: [
    "**/*.(t|j)s"
  ],
  coverageDirectory: "../coverage",
  testEnvironment: "node"
};