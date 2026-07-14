import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createFolder,
  closeAllCollections,
  openNewFolderModal,
  createFolderViaModal,
  revealFilesystemName
} from '../../utils/page';
import { findCollectionDir } from '../utils';

test.describe('Naming collisions - create folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('creating a folder with an existing name keeps the name and suffixes the directory', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-create-dup');

    await createCollection(page, 'Create Folder Dup', testDir, 'bru');
    await createFolder(page, 'Auth', 'Create Folder Dup');
    await createFolderViaModal(page, 'Create Folder Dup', 'Auth');

    await test.step('Sidebar shows two "Auth" folders (duplicate display names allowed)', async () => {
      await expect(nc.itemByTitle('Auth')).toHaveCount(2);
    });

    await test.step('On disk: typed name preserved, second directory silently suffixed', async () => {
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth1'))).toBe(true);
    });
  });

  test('creating a folder with a reserved name is blocked and creates nothing', async ({ page, createTmpDir }) => {
    const { modal, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-create-reserved');

    await createCollection(page, 'Create Folder Reserved', testDir, 'bru');

    await test.step('Enter reserved name "CON", reveal filesystem name, submit', async () => {
      await openNewFolderModal(page, 'Create Folder Reserved');
      await nc.newFolderInput().fill('CON');
      await revealFilesystemName(page);
      await modal.button('Create').click();
    });

    await test.step('Reserved-name error is shown and nothing is created', async () => {
      await expect(nc.toast('Name cannot be a reserved device name.')).toBeVisible();
      await expect(nc.anyModal()).toBeVisible();
      await expect(nc.itemByTitle('CON')).toHaveCount(0);
      expect(fs.existsSync(path.join(findCollectionDir(testDir), 'CON'))).toBe(false);
    });

    // Close the modal so afterEach isn't blocked by the backdrop.
    await nc.anyModal().getByRole('button', { name: 'Cancel' }).click();
    await expect(nc.anyModal()).toHaveCount(0, { timeout: 5000 });
  });
});
