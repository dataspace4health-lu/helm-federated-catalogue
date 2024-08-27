import { test, expect } from '@playwright/test';

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