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

    await test.step('Create three collections in deeply nested folders', async () => {
      for (const { dir, name } of collections) {
        writeCollection(dir, name);
      }
    });

    await test.step('Open the root folder', async () => {
      await openCollectionFromDialog(page, electronApp, rootDir);
    });

    await test.step('Modal lists every nested collection', async () => {
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
