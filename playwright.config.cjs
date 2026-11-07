const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.cjs",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:8000",
    channel: "chromium",
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "python -m http.server 8000",
        url: "http://127.0.0.1:8000",
        reuseExistingServer: !process.env.CI,
      },
});
