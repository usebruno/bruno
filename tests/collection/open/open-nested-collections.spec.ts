import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollectionFromDialog,
  toggleOpenCollectionItem
} from '../../utils/page';

const writeCollection = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opencollection.yml'), `opencollection: "1.0.0"\ninfo:\n  name: ${name}\n`);
};

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

    await test.step('Create a parent collection with two nested collections', async () => {
      for (const { dir, name } of collections) {
        writeCollection(dir, name);
      }
    });

    await test.step('Open the parent folder', async () => {
      await openCollectionFromDialog(page, electronApp, parentDir);
    });

    await test.step('Modal lists the parent and both nested collections', async () => {
      await expect(modal.byTitle('Open Collection')).toBeVisible();
      await expect(openCollectionPicker.titles()).toHaveCount(collections.length);
      for (const { name } of collections) {
        await expect(openCollectionPicker.item(name)).toBeVisible();
      }
    });

    await test.step('Select every collection and open them', async () => {
      for (const { name } of collections) {
        await toggleOpenCollectionItem(page, name);
        await expect(openCollectionPicker.itemCheckbox(name)).toBeChecked();
      }
      await modal.button('Open').click();
    });

    await test.step('All selected collections appear in the sidebar', async () => {
      for (const { name } of collections) {
        await expect(sidebar.collection(name)).toBeVisible();
      }
    });
  });
});
