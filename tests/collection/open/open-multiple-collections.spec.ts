import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections } from '../../utils/page';

test.describe('Open Multiple Collections', () => {
  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      (global as any).__origShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (global as any).__origShowOpenDialog;
    });
  });

  test('TC-777 Should open multiple collections using Open Collection feature', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    // Create two test collections with proper bruno.json files
    const collection1Dir = await createTmpDir('collection-1');
    const collection2Dir = await createTmpDir('collection-2');

    await test.step('Create two test collections', async () => {
      // Create bruno.json for first collectin
      const collection1Config = {
        version: '1',
        name: 'Test Collection 1',
        type: 'collection'
      };
      // Create bruno.json for second collection
      const collection2Config = {
        version: '1',
        name: 'Test Collection 2',
        type: 'collection'
      };

      fs.writeFileSync(path.join(collection1Dir, 'bruno.json'), JSON.stringify(collection1Config, null, 2));
      fs.writeFileSync(path.join(collection2Dir, 'bruno.json'), JSON.stringify(collection2Config, null, 2));
    });

    await test.step('Mock the electron dialog to return multiple folder selections', async () => {
      await electronApp.evaluate(({ dialog }, { collection1Dir, collection2Dir }) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [collection1Dir, collection2Dir]
        });
      },
      { collection1Dir, collection2Dir });
    });

    await test.step('Collection is not in the sidebar yet', async () => {
      await expect(page.locator('#sidebar-collection-name').getByText('Test Collection 1')).not.toBeVisible();
    });

    await test.step('Click on plus icon button and then "Open collection" in the dropdown', async () => {
      await page.getByTestId('collections-header-add-menu').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Open collection' }).click();
    });

    await test.step('Wait for both collections to appear in the sidebar', async () => {
      const collection1Element = page.locator('#sidebar-collection-name').getByText('Test Collection 1');
      const collection2Element = page.locator('#sidebar-collection-name').getByText('Test Collection 2');

      await expect(collection1Element).toBeVisible();
      await expect(collection2Element).toBeVisible();
    });

    await test.step('Close all collections', async () => {
      await closeAllCollections(page);
    });
  });

  test('Should handle invalid collection path and display error', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    // Directory without bruno.json file
    const collection1Dir = await createTmpDir('collection-1');
    const collection2Dir = 'invalid-collection-path';

    // Count collections before attempting to open invalid ones
    const collectionCountBefore = await page.locator('#sidebar-collection-name').count();

    await test.step('Mock the electron dialog to return multiple folder selections', async () => {
      // Mock the electron dialog to return multiple folder selections
      await electronApp.evaluate(({ dialog }, { collection1Dir, collection2Dir }) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [collection1Dir, collection2Dir]
        });
      },
      { collection1Dir, collection2Dir });
    });

    await test.step('Click on plus icon button and then "Open collection" in the dropdown', async () => {
      await page.getByTestId('collections-header-add-menu').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Open collection' }).click();
    });

    await test.step('Wait for error toasts to appear', async () => {
      // Wait for error toasts to appear
      await page.waitForTimeout(1000);
    });

    await test.step('Verify no collections were opened', async () => {
      // Verify no collections were opened
      await expect(page.locator('#sidebar-collection-name')).toHaveCount(collectionCountBefore);
    });

    await test.step('Verify invalid collection error', async () => {
      // Verify invalid collection error
      const invalidCollectionError = page.getByText('No Bruno collections found').first();
      await expect(invalidCollectionError).toBeVisible();
    });
  });
});
