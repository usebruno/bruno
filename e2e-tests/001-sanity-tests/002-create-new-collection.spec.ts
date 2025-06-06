import { test, expect } from '../../playwright';

test('Create new collection and add a simple HTTP request', async ({ page, createTmpDir }) => {
  await page.getByLabel('Create Collection').click();
  await page.getByLabel('Name').click();
  await page.getByLabel('Name').fill('test-collection');
  await page.getByLabel('Name').press('Tab');
  await page.getByLabel('Location').fill(await createTmpDir('test-collection'));
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByText('test-collection').click();
  await page.getByLabel('Safe ModeBETA').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.locator('#create-new-tab').getByRole('img').click();
  await page.getByPlaceholder('Request Name').fill('r1');
  await page.getByPlaceholder('Request URL').click();
  await page.getByPlaceholder('Request URL').fill('http://localhost:8081');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.locator('pre').filter({ hasText: 'http://localhost:' }).click();
  await page.locator('textarea').fill('/ping');
  await page.locator('#send-request').getByRole('img').nth(2).click();

  await expect(page.getByRole('main')).toContainText('200 OK');

  await page.getByRole('tab', { name: 'GET r1' }).locator('circle').click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('GETr1').click();
  await page.getByRole('button', { name: 'Clear response' }).click();
  await page.locator('body').press('ControlOrMeta+Enter');

  await expect(page.getByRole('main')).toContainText('200 OK');
});