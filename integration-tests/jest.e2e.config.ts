const commonJestConfig = require("./jest.config");

module.exports = {
  ...commonJestConfig,
  testEnvironment: "node",
  roots: ["<rootDir>/test/e2e"],
  globalSetup: "<rootDir>/test/e2e/globalSetup.ts",
  setupFiles: ["<rootDir>/test/e2e/setupFile.ts"],
};
