const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/compatibility",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    actionTimeout: 15000,
    browserName: "chromium",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "production", testMatch: "production.spec.js" },
    { name: "development-http", testMatch: "development.spec.js" },
    { name: "development-https", testMatch: "development.spec.js" },
    { name: "development-custom-https", testMatch: ["development.spec.js", "certificates.spec.js"] },
    { name: "jest-proxy", testMatch: "proxy.spec.js" },
    { name: "build-loaders", testMatch: "optimizer.spec.js" },
  ],
});
