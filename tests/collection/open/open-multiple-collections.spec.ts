import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';

import { closeAllCollections } from '../../utils/page';

test.describe('Open Multiple Collections', () => {
  let originalShowOpenDialog;

  test.beforeAll(async ({ electronApp }) => {
    // save the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      originalShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    // restore the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = originalShowOpenDialog;
    });
  });

  test('Should open multiple collections using Open Collection feature', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    // Create two test collections with proper bruno.json files
    const collection1Dir = await createTmpDir('collection-1');
    const collection2Dir = await createTmpDir('collection-2');

    // Create bruno.json for first collection
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

    // Mock the electron dialog to return multiple folder selections
    await electronApp.evaluate(({ dialog }, { collection1Dir, collection2Dir }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [collection1Dir, collection2Dir]
      });
    },
    { collection1Dir, collection2Dir });

    await expect(page.locator('#sidebar-collection-name').getByText('Test Collection 1')).not.toBeVisible();

    // Click on Open Collection button
    await page.locator('button').filter({ hasText: 'Open Collection' }).click();

    // Wait for both collections to appear in the sidebar
    const collection1Element = page.locator('#sidebar-collection-name').getByText('Test Collection 1');
    const collection2Element = page.locator('#sidebar-collection-name').getByText('Test Collection 2');

    await expect(collection1Element).toBeVisible();
    await expect(collection2Element).toBeVisible();

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

    // Mock the electron dialog to return multiple folder selections
    await electronApp.evaluate(({ dialog }, { collection1Dir, collection2Dir }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [collection1Dir, collection2Dir]
      });
    },
    { collection1Dir, collection2Dir });

    await expect(page.locator('#sidebar-collection-name').getByText('Test Collection 1')).not.toBeVisible();

    // Click on Open Collection button
    await page.getByRole('button', { name: 'Open Collection' }).click();

    // Verify no collections were opened
    await expect(page.locator('#sidebar-collection-name')).toHaveCount(0);

    // Verify invalid collection error
    const invalidCollectionError = page.getByText('The collection is not valid (bruno.json not found)').first();
    await expect(invalidCollectionError).toBeVisible();

    // Verify invalid path error
    const invalidPathError = page.getByText('Some selected folders could not be opened').getByText('invalid-collection-path').first();
    await expect(invalidPathError).toBeVisible();
  });
});
