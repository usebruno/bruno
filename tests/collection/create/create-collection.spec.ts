import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Create collection', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Create collection and add a simple HTTP request', async ({ page, createTmpDir }) => {
    // Create a new collection
    await page.getByLabel('Create Collection').click();
    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill('test-collection');
    await page.getByLabel('Name').press('Tab');
    await page.getByLabel('Location').fill(await createTmpDir('test-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('test-collection').click();

    // Select safe mode
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a new request
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByPlaceholder('Request Name').fill('r1');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('http://localhost:8081');
    await page.getByRole('button', { name: 'Create' }).click();

    // Send a request
    await page.locator('#request-url .CodeMirror').click();
    await page.locator('textarea').fill('/ping');
    await page.locator('#send-request').getByTitle('Save Request').click();
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // Verify the response
    await expect(page.getByRole('main')).toContainText('200 OK');
  });
});