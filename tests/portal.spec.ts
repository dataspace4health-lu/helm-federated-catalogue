import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://dataspace4health.local/portal/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Demo Portal/);
});

test('click login button', async ({ page }) => {
  await page.goto('http://dataspace4health.local/portal/');

  // Click the get started link.
  await page.click('a.btn.btn-success');

  // Expects page to have a heading with the name of Installation.
  await expect(page).toHaveTitle(/GAIA-X/);
});

test('check menu', async ({ page }) => {
  await page.goto('http://dataspace4health.local/portal/');

  const sidebarWrapper = page.locator('#sidebar-wrapper');
  await expect(sidebarWrapper).toBeVisible();

  // Verify the presence of "Participants", "Users", and "Roles" within the sidebar
  await expect(sidebarWrapper).toContainText('Participants');
  await expect(sidebarWrapper).toContainText('Users');
  await expect(sidebarWrapper).toContainText('Roles');
});