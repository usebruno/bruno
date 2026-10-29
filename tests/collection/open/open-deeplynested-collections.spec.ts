import { test, expect } from '../../../playwright';
import * as path from 'path';
import { initBruCollection } from '../../utils/fixtures/bru-collection';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollectionFromDialog,
  toggleOpenCollectionItem
} from '../../utils/page';

test.describe('Open deeply nested collections', () => {
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

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-4449 discovers all collections in deeply nested folders and opens the selected collections in the sidebar', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const { modal, openCollectionPicker, sidebar } = buildCommonLocators(page);
    const rootDir = await createTmpDir('open-deeplynested-collections');
    const collections = [
      { dir: path.join(rootDir, 'services', 'payments', 'v1'), name: 'Payments Collection' },
      { dir: path.join(rootDir, 'services', 'identity', 'internal', 'v2'), name: 'Identity Collection' },
      { dir: path.join(rootDir, 'teams', 'platform', 'apis', 'internal', 'inventory'), name: 'Inventory Collection' }
    ];

    for (const { dir, name } of collections) {
      initBruCollection(dir, name);
    }

    await openCollectionFromDialog(page, electronApp, rootDir);

    await expect(modal.byTitle('Open Collection')).toBeVisible();
    await expect(openCollectionPicker.titles()).toHaveCount(collections.length);
    for (const { name } of collections) {
      await expect(openCollectionPicker.item(name)).toBeVisible();
    }

    for (const { name } of collections) {
      await toggleOpenCollectionItem(page, name);
      await expect(openCollectionPicker.itemCheckbox(name)).toBeChecked();
    }
    await modal.button('Open').click();

    for (const { name } of collections) {
      await expect(sidebar.collection(name)).toBeVisible();
    }
  });
});
