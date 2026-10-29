import { test, expect } from '../../../playwright';
import * as path from 'path';
import { initBruCollection } from '../../utils/fixtures/bru-collection';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollectionFromDialog,
  toggleOpenCollectionItem
} from '../../utils/page';

test.describe('Open nested collections', () => {
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

  test('TC-4448 lists the parent and nested sibling collections in the modal and opens all selected collections in the sidebar', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const { modal, openCollectionPicker, sidebar } = buildCommonLocators(page);
    const parentDir = await createTmpDir('open-nested-collections');
    const collections = [
      { dir: parentDir, name: 'Parent Collection' },
      { dir: path.join(parentDir, 'alpha'), name: 'Alpha Collection' },
      { dir: path.join(parentDir, 'beta'), name: 'Beta Collection' }
    ];

    for (const { dir, name } of collections) {
      initBruCollection(dir, name);
    }

    await openCollectionFromDialog(page, electronApp, parentDir);

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
