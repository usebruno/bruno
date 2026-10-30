import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildCommonLocators,
  closeAllCollections,
  waitForCollectionMount
} from '../../utils/page';

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

  test('TC777: Verify opening of multiple collections with successful launch', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    // Create two test collections with proper bruno.json files
    const collection1Dir = await createTmpDir('collection-1');
    const collection2Dir = await createTmpDir('collection-2');
    const collection1Name = path.basename(collection1Dir);
    const collection2Name = path.basename(collection2Dir);
    const collection1 = locators.sidebar.collection(collection1Name);
    const collection2 = locators.sidebar.collection(collection2Name);

    await test.step('Navigate to the path containing multiple collections', async () => {
      // Create bruno.json for first collection
      const collection1Config = {
        version: '1',
        name: collection1Name,
        type: 'collection'
      };
      // Create bruno.json for second collection
      const collection2Config = {
        version: '1',
        name: collection2Name,
        type: 'collection'
      };

      fs.writeFileSync(path.join(collection1Dir, 'bruno.json'), JSON.stringify(collection1Config, null, 2));
      fs.writeFileSync(path.join(collection2Dir, 'bruno.json'), JSON.stringify(collection2Config, null, 2));

      expect(fs.existsSync(collection1Dir)).toBe(true);
      expect(fs.existsSync(collection2Dir)).toBe(true);
      expect(fs.existsSync(path.join(collection1Dir, 'bruno.json'))).toBe(true);
      expect(fs.existsSync(path.join(collection2Dir, 'bruno.json'))).toBe(true);
    });

    await test.step('Select two different collections simultaneously', async () => {
      const selectedPaths = [collection1Dir, collection2Dir];

      expect(selectedPaths).toHaveLength(2);
      expect(collection1Dir).not.toBe(collection2Dir);
      expect(new Set(selectedPaths).size).toBe(2);
      await electronApp.evaluate(({ dialog }, { collection1Dir, collection2Dir }) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [collection1Dir, collection2Dir]
        });
      },
      { collection1Dir, collection2Dir });
    });

    await test.step('Initiate the simultaneous opening command (e.g., multi-select and open or specific bulk open action)', async () => {
      await expect(collection1).not.toBeVisible();
      await expect(collection2).not.toBeVisible();

      // Click on plus icon button and then "Open collection" in the dropdown
      await locators.plusMenu.button().click();
      await locators.plusMenu.openCollection().click();

      await Promise.all([
        collection1.waitFor({ state: 'visible' }),
        collection2.waitFor({ state: 'visible' })
      ]);
    });

    await test.step('Verify the launch status of both collections', async () => {
      await waitForCollectionMount(page, collection1Name);
      await waitForCollectionMount(page, collection2Name);

      await expect(collection1).toBeVisible();
      await expect(collection2).toBeVisible();
      await expect(collection1).toHaveCount(1);
      await expect(collection2).toHaveCount(1);
    });
    // cleanup: close all collections
    await closeAllCollections(page);
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
