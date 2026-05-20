import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest } from '../../utils/page';

test.describe('Create collection', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should show validation error for empty name in modal and keep modal open', async ({ page }) => {
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    const inlineCreator = page.locator('.inline-collection-creator');
    await inlineCreator.waitFor({ state: 'visible', timeout: 5000 });
    await inlineCreator.locator('.cog-btn').click();

    const createCollectionModal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Collection' });
    await createCollectionModal.waitFor({ state: 'visible', timeout: 5000 });

    const submitButton = createCollectionModal.getByRole('button', { name: 'Create', exact: true });
    await createCollectionModal.getByLabel('Name').fill('');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(createCollectionModal).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await expect(createCollectionModal.getByText('Collection name is required')).toBeVisible({ timeout: 2000 });

    await createCollectionModal.getByRole('button', { name: 'Cancel' }).click();
  });

  test('should show validation error for whitespace-only name in modal and keep modal open', async ({ page }) => {
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    const inlineCreator = page.locator('.inline-collection-creator');
    await inlineCreator.waitFor({ state: 'visible', timeout: 5000 });
    await inlineCreator.locator('.cog-btn').click();

    const createCollectionModal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Collection' });
    await createCollectionModal.waitFor({ state: 'visible', timeout: 5000 });

    const submitButton = createCollectionModal.getByRole('button', { name: 'Create', exact: true });
    await createCollectionModal.getByLabel('Name').fill('   ');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(createCollectionModal).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await expect(createCollectionModal.getByText('Collection name can\'t be empty')).toBeVisible({ timeout: 2000 });

    await createCollectionModal.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Create collection and add a simple HTTP request', async ({ page, createTmpDir }) => {
    const collectionName = 'test-collection';
    const requestName = 'ping';

    await createCollection(page, collectionName, await createTmpDir(collectionName));

    // Create a new request using the dialog/modal flow
    await createRequest(page, requestName, collectionName);

    // Set the URL
    await page.locator('#request-url .CodeMirror').click();
    await page.locator('#request-url').locator('textarea').fill('http://localhost:8081');
    await page.locator('#request-actions').getByTitle('Save Request').click();

    // Send a request
    await page.locator('#request-url .CodeMirror').click();
    await page.locator('#request-url').locator('textarea').fill('/ping');
    await page.locator('#request-actions').getByTitle('Save Request').click();
    await page.getByTestId('send-arrow-icon').click();

    // Verify the response
    await expect(page.getByRole('main')).toContainText('200 OK');
  });
});
