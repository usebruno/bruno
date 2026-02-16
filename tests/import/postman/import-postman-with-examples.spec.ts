import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, openCollection } from '../../utils/page';

test.describe('Import Postman Collection with Examples', () => {
  let originalShowOpenDialog;

  test.beforeAll(async ({ electronApp }) => {
    // save the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      originalShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp, page }) => {
    await closeAllCollections(page);
    // restore the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = originalShowOpenDialog;
    });
  });

  test('should import Postman collection with examples successfully', async ({ page, electronApp, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-examples.json');

    // Create a temporary directory for the collection to be imported into
    const importDir = await createTmpDir('imported-collection');

    // Mock the electron dialog to return the import directory selection
    await electronApp.evaluate(({ dialog }, { importDir }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [importDir]
      });
    }, { importDir });

    await test.step('Open import collection modal', async () => {
      await page.getByTestId('collections-header-add-menu').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();
    });

    await test.step('Wait for import modal and verify title', async () => {
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Upload Postman collection file using hidden file input', async () => {
      // The "choose a file" button triggers a hidden file input, so we can directly set files on it
      await page.setInputFiles('input[type="file"]', postmanFile);

      // Wait for location modal to appear after file processing
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Verify no parsing errors occurred', async () => {
      const hasError = await page.getByText('Failed to parse the file').isVisible().catch(() => false);
      if (hasError) {
        throw new Error('Collection import failed with parsing error');
      }
    });

    await test.step('Verify location selection modal appears', async () => {
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Verify collection name appears in location modal', async () => {
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await expect(locationModal.getByText('collection with examples')).toBeVisible();
    });

    await test.step('Click Browse link to select collection folder', async () => {
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await locationModal.getByText('Browse').click();
    });

    await test.step('Complete import by clicking import button', async () => {
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await locationModal.getByRole('button', { name: 'Import' }).click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Open collection', async () => {
      await openCollection(page, 'collection with examples');
    });

    await test.step('Verify collection name appears in sidebar', async () => {
      const collectionName = page.locator('#sidebar-collection-name').getByText('collection with examples');
      await expect(collectionName).toBeVisible();
    });

    await test.step('Verify request exists in the collection', async () => {
      const requestItem = page.locator('.collection-item-name').getByText('New Request');
      await expect(requestItem).toBeVisible();
    });

    await test.step('Click chevron to expand examples', async () => {
      const chevronIcon = page.getByTestId('request-item-chevron');
      await expect(chevronIcon).toBeVisible();
      await chevronIcon.click();
    });

    await test.step('Verify both examples are visible', async () => {
      const successExample = page.locator('.collection-item-name').getByText('Success Response');
      const errorExample = page.locator('.collection-item-name').getByText('Error Response');

      await expect(successExample).toBeVisible();
      await expect(errorExample).toBeVisible();
    });
  });
});
