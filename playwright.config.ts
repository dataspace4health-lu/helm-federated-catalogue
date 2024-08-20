import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup/token-setup'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://dataspace4health.local',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      
      // Add authorization token to all requests.
      // Assuming personal access token available in the environment.
      //'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJieUFDdV9Wbm56Z1FibTItcnY5eGdwbC12Yy1zLVFON21GbnUzNTJ3V2NJIn0.eyJleHAiOjE3MjQxNDMxMjYsImlhdCI6MTcyNDE0MjIyNiwianRpIjoiMmYyYzZkMGYtN2I3MS00MTBiLTg1MmMtMDIwNzkxY2QyZDZhIiwiaXNzIjoiaHR0cDovL2RhdGFzcGFjZTRoZWFsdGgubG9jYWwvaWFtL3JlYWxtcy9nYWlhLXgiLCJzdWIiOiIzZTNhZmVlYi1lYWE5LTQ4NDMtOTg3Zi03NzlhYTc3ZGFhZWMiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJmZWRlcmF0ZWQtY2F0YWxvZ3VlIiwic2Vzc2lvbl9zdGF0ZSI6IjhlNzY5YTIyLWNmMmQtNGU5Yi1hNGY4LWM1NjdkZDU1YmZlNCIsInJlc291cmNlX2FjY2VzcyI6eyJmZWRlcmF0ZWQtY2F0YWxvZ3VlIjp7InJvbGVzIjpbIlJvLU1VLUNBIiwiUm8tTVUtQSIsIlJvLVNELUEiLCJSby1QQS1BIl19fSwic2NvcGUiOiJnYWlhLXgiLCJzaWQiOiI4ZTc2OWEyMi1jZjJkLTRlOWItYTRmOC1jNTY3ZGQ1NWJmZTQiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsIm5hbWUiOiJUZXN0IFVzZXIiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ0ZXN0dXNlciIsImdpdmVuX25hbWUiOiJUZXN0IiwiZmFtaWx5X25hbWUiOiJVc2VyIn0.kg0FUEaQ4kcEfGxS_mg6Ynb8eyuUmNgt9MgOKYLBFwC9ZvMuBnlabxvch-G4SqS-Q9hg3YJJ6wsK0akWCAYFjpaLfrgOSF2wlcX8VJwmDKgUuqeIWHBnXQdyUIEQo5STz27-UnZWYabCSwkZwWRQhkwbrj1hRA0wbGnYnHHRBDZOXwv1HeOtnfOlFJpJYHJqdK3Nlz2-0sxxWdNRMoQKCBTsHqj0c2nnVMXf7sAaHN3MYSeoNQwwewZI4iKIeCbfBGLMWgGUQTWjbyXeghcuWvAiOllldEoVqXw27FJy24BYuqsunjXhvSYMx0_6q4qANnRCdDU-r6DRK1UGbbAoUQ',
      'Authorization': `Bearer ${process.env.TOKEN}`
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
