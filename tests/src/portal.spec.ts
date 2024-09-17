import { test, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

test('UI Authentication', async ({ page }) => {
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

test('Check the page has a title ', async ({ page }) => {
  await page.goto('/portal/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Demo Portal/);
});

test('Test login button', async ({ page }) => {
  await page.goto('/portal/');

  // Click the get started link.
  //await page.click('a.btn.btn-success');
  await page.locator(".btn.btn-success").click()

  // Expects page to have a heading with the name of Installation.
  await expect(page).toHaveTitle(/GAIA-X/);
});

test('Test menu', async ({ page }) => {
  await page.goto('/portal/');

  const sidebarWrapper = page.locator('#sidebar-wrapper');
  await expect(sidebarWrapper).toBeVisible();

  // Verify the presence of "Participants", "Users", and "Roles" within the sidebar
  await expect(sidebarWrapper).toContainText('Participants');
  await expect(sidebarWrapper).toContainText('Users');
  await expect(sidebarWrapper).toContainText('Roles');
});