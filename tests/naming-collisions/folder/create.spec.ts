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
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-create-dup');

    await createCollection(page, 'Create Folder Dup', testDir, 'bru');
    await createFolder(page, 'Auth', 'Create Folder Dup');
    await createFolderViaModal(page, 'Create Folder Dup', 'Auth');

    await test.step('Sidebar shows two "Auth" folders (duplicate display names allowed)', async () => {
      await expect(sidebar.itemByName('Auth')).toHaveCount(2);
    });

    await test.step('On disk: typed name preserved, second directory silently suffixed', async () => {
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth 1'))).toBe(true);
    });
  });

  test('creating a folder with a reserved name is blocked and creates nothing', async ({ page, createTmpDir }) => {
    const { sidebar, modal } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-create-reserved');

    await createCollection(page, 'Create Folder Reserved', testDir, 'bru');

    await test.step('Enter reserved name "CON", reveal filesystem name, submit', async () => {
      await openNewFolderModal(page, 'Create Folder Reserved');
      await sidebar.newFolderModal.nameInput().fill('CON');
      await revealFilesystemName(page);
      await modal.button('Create').click();
    });

    await test.step('Reserved-name error is shown and nothing is created', async () => {
      await expect(modal.formError('Name cannot be a reserved device name.')).toBeVisible();
      await expect(modal.any()).toBeVisible();
      await expect(sidebar.itemByName('CON')).toHaveCount(0);
      expect(fs.existsSync(path.join(findCollectionDir(testDir), 'CON'))).toBe(false);
    });

    // Close the modal so afterEach isn't blocked by the backdrop.
    await modal.any().getByRole('button', { name: 'Cancel' }).click();
    await expect(modal.any()).toHaveCount(0, { timeout: 5000 });
  });

  test('creating a root folder whose name only contains "environments" is allowed', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('folder-create-env-substring');

    await createCollection(page, 'Create Folder Env Substring', testDir, 'bru');
    await createFolder(page, 'Project Environments', 'Create Folder Env Substring');

    await test.step('On disk: the folder is created', async () => {
      expect(fs.existsSync(path.join(findCollectionDir(testDir), 'Project Environments'))).toBe(true);
    });
  });

  test('creating a root folder named "Environments" is blocked', async ({ page, createTmpDir }) => {
    const { sidebar, modal } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-create-env-reserved');

    await createCollection(page, 'Create Folder Env Reserved', testDir, 'bru');

    await test.step('Enter "Environments", reveal filesystem name, submit', async () => {
      await openNewFolderModal(page, 'Create Folder Env Reserved');
      await sidebar.newFolderModal.nameInput().fill('Environments');
      await revealFilesystemName(page);
      await modal.button('Create').click();
    });

    await test.step('Reserved-name error is shown and nothing is created', async () => {
      await expect(modal.formError('The folder name "environments" at the root of the collection is reserved in bruno')).toBeVisible();
      await expect(modal.any()).toBeVisible();
      await expect(sidebar.itemByName('Environments')).toHaveCount(0);
      // readdirSync keeps on-disk casing; existsSync would match a lowercase `environments` dir on case-insensitive filesystems.
      expect(fs.readdirSync(findCollectionDir(testDir))).not.toContain('Environments');
    });

    await modal.button('Cancel').click();
    await expect(modal.any()).toHaveCount(0, { timeout: 5000 });
  });
});
