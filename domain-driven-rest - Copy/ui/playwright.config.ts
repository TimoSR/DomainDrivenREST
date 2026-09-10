import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: {
    baseURL: process.env.DDR_TEST_URL ?? "http://localhost:5137/request-builder/",
    channel: process.platform === "win32" ? "msedge" : undefined,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "dotnet run --project ../samples/DemoApi --no-build --no-launch-profile --urls http://localhost:5137",
    url: "http://localhost:5137/request-builder/",
    env: { ASPNETCORE_ENVIRONMENT: "Development" },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
