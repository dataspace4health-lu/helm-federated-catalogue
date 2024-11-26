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

// const customConfig = {
//   NTT: {
//     issuer: "did:web:dataspace4health.local1",
//     idPrefix: "https://dataspace4health.local/participants/ntt",
//     legalName: "NTT LUXEMBOURG PSF S.A.",
//     leiCode: "213800IYYHAS95EZXP28",
//     headquarterAddress: "LU-CA",
//     legalAddress: "LU-CA",
//   },
//   LIH: {
//     issuer: "did:web:dataspace4health.local",
//     idPrefix: "https://dataspace4health.local/participants/ntt",
//     legalName: "NTT LUXEMBOURG PSF S.A.",
//     leiCode: "213800IYYHAS95EZXP28",
//     headquarterAddress: "LU-CA",
//     legalAddress: "LU-CA",
//   },
//   LNDS: {
//     issuer: "did:web:dataspace4health.local",
//     idPrefix: "https://dataspace4health.local/participants/ntt",
//     legalName: "NTT LUXEMBOURG PSF S.A.",
//     leiCode: "213800IYYHAS95EZXP28",
//     headquarterAddress: "LU-CA",
//     legalAddress: "LU-CA",
//   },
//   HRS: {
//     issuer: "did:web:dataspace4health.local",
//     idPrefix: "https://dataspace4health.local/participants/ntt",
//     legalName: "NTT LUXEMBOURG PSF S.A.",
//     leiCode: "213800IYYHAS95EZXP28",
//     headquarterAddress: "LU-CA",
//     legalAddress: "LU-CA",
//   },
// };
export default defineConfig({
  testDir: './src',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  timeout: 120_000,
  /*set timeout to 120 seconds */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://dataspace4health.local',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  // customConfig
  /* Configure projects for major browsers */
  // projects: [
  //   {
  //     name: 'chromium',
  //     use: { ...devices['Desktop Chrome'] },
  //   },

  //   {
  //     name: 'firefox',
  //     use: { ...devices['Desktop Firefox'] },
  //   },

  //   {
  //     name: 'webkit',
  //     use: { ...devices['Desktop Safari'] },
  //   },

  //   /* Test against mobile viewports. */
  //   // {
  //   //   name: 'Mobile Chrome',
  //   //   use: { ...devices['Pixel 5'] },
  //   // },
  //   // {
  //   //   name: 'Mobile Safari',
  //   //   use: { ...devices['iPhone 12'] },
  //   // },

  //   /* Test against branded browsers. */
  //   // {
  //   //   name: 'Microsoft Edge',
  //   //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
  //   // },
  //   // {
  //   //   name: 'Google Chrome',
  //   //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  //   // },
  // ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
