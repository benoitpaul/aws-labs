const commonJestConfig = require("./jest.config");

module.exports = {
  ...commonJestConfig,
  testEnvironment: "node",
  roots: ["<rootDir>/test/integration"],
  globalSetup: "<rootDir>/test/integration/globalSetup.ts",
};
