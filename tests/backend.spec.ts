import { test, expect, request } from '@playwright/test';


let host: string = "dataspace4health.local"

const baseURL: string = `http://${host}`;

// Example test for an endpoint
test('GET API swagger', async ({ request }) => {
  const response = await request.get(`/catalog/swagger-ui/index.html`);
  expect(response.status()).toBe(200);
  // Add further assertions based on the API response
});
test('Get List of users', async ({ request }) => {
  const usersList = await request.get(`catalog/users`);
  expect(usersList.ok()).toBeTruthy();
  let jsonUserList= await usersList.json()
  expect(jsonUserList).toHaveProperty('items');
  expect(Array.isArray(jsonUserList.items)).toBe(true);
});