import { test, expect } from '../../../playwright';
import {buildCommonLocators,closeAllCollections,createCollection,openCollectionSettings,selectCollectionPaneTab} from '../../utils/page';

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

  test('TC99: Verify user able to Create a new collection', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'test-collection';
    const locators = buildCommonLocators(page);
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await expect(locators.toast.collectionCreated()).toBeVisible();
    await expect(locators.sidebar.collection(collectionName)).toBeVisible();
  });

  test('a newly created collection has no version set (shows "Not Set")', async ({ page, createTmpDir }) => {
    const collectionName = 'versioned-collection';
    await createCollection(page, collectionName, await createTmpDir(collectionName));

    await openCollectionSettings(page, collectionName);
    await selectCollectionPaneTab(page, 'overview');
    await expect(page.getByTestId('info-version-value')).toHaveText('Not Set');
  });
});
