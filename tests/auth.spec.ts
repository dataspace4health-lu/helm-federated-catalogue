import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('Authenticate', async ({ page }) => {
  // Perform authentication steps. Replace these actions with your own.
  await page.goto('/portal/');
  await page.click('a.btn.btn-success');
  await page.getByRole('textbox',{name:'username'}).fill('testuser');  
  await page.getByRole('textbox',{name:'password'}).fill('xfsc4Ntt!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Wait until the page receives the cookies.
  //
  // Sometimes login flow sets cookies in the process of several redirects.
  // Wait for the final URL to ensure that the cookies are actually set.
  
  // Alternatively, you can wait until the page reaches a state where all cookies are set.
  await expect(page).toHaveTitle(/Demo Portal/);

  // End of authentication steps.

  await page.context().storageState({ path: authFile });
});