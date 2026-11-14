module.exports = {
  roots: ["<rootDir>/src"],
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  transform: { "^.+\\.[jt]sx?$": "babel-jest" },
  moduleNameMapper: {
    "\\.css$": "<rootDir>/tests/mocks/style.cjs",
    "\\.(png|jpe?g|gif|svg|ico)$": "<rootDir>/tests/mocks/file.cjs",
  },
  resetMocks: true,
};
