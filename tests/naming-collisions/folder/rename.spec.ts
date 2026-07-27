import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createFolder,
  createRequest,
  closeAllCollections,
  openRenameModal,
  renameItemTo,
  renameViaFilename,
  revealFilesystemName
} from '../../utils/page';
import { findCollectionDir } from '../utils';

test.describe('Naming collisions - rename folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('renaming a folder to a free name changes both the display name and the directory', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-free');

    await createCollection(page, 'Rename Folder Free', testDir, 'bru');
    await createFolder(page, 'Auth', 'Rename Folder Free');
    await renameItemTo(page, 'Auth', 'Accounts', 'folder');

    await test.step('Sidebar and disk reflect the new name; old directory is gone', async () => {
      await expect(nc.itemByTitle('Accounts')).toHaveCount(1);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Accounts'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(false);
    });
  });

  test('a normal folder rename produces no duplicate node and keeps nested items', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-no-dup');

    await createCollection(page, 'Rename No Dup', testDir, 'bru');
    await createFolder(page, 'Auth', 'Rename No Dup');
    await sidebar.folder('Auth').dblclick(); // expand so nested item renders
    await createRequest(page, 'login', 'Auth', { inFolder: true });
    await renameItemTo(page, 'Auth', 'Accounts', 'folder');

    await test.step('Exactly one "Accounts" node (no duplicate); nested request follows', async () => {
      await expect(nc.itemByTitle('Accounts')).toHaveCount(1);
      await expect(nc.itemByTitle('Auth')).toHaveCount(0);

      await sidebar.folder('Accounts').dblclick();
      await expect(sidebar.folderRequest('Accounts', 'login')).toBeVisible();

      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Accounts', 'login.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(false);
    });
  });

  test('renaming a folder to an existing name keeps the display name and suffixes the directory', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-collision');

    await createCollection(page, 'Rename Folder Collision', testDir, 'bru');
    await createFolder(page, 'Accounts', 'Rename Folder Collision'); // Accounts dir exists
    await createFolder(page, 'Auth', 'Rename Folder Collision');
    await renameItemTo(page, 'Auth', 'Accounts', 'folder');

    await test.step('Two "Accounts" entries; directory silently suffixed, old dir gone', async () => {
      await expect(nc.itemByTitle('Accounts')).toHaveCount(2);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Accounts'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Accounts1'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(false);
    });
  });

  test('editing the directory name to an existing folder suffixes it, keeps the display name', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-dir-collision');

    await createCollection(page, 'Rename Dir Collision', testDir, 'bru');
    await createFolder(page, 'Accounts', 'Rename Dir Collision'); // Accounts dir exists
    await createFolder(page, 'Auth', 'Rename Dir Collision');
    await renameViaFilename(page, 'Auth', 'Accounts', 'folder');

    await test.step('Display name stays "Auth"; directory silently suffixed to "Accounts1"', async () => {
      await expect(nc.itemByTitle('Auth')).toHaveCount(1);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Accounts'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Accounts1'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(false);
    });
  });

  test('editing the directory name to a free name renames the directory, keeps the display name', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-dir-free');

    await createCollection(page, 'Rename Dir Free', testDir, 'bru');
    await createFolder(page, 'Auth', 'Rename Dir Free');
    await renameViaFilename(page, 'Auth', 'Accounts', 'folder');

    await test.step('Display name stays "Auth"; directory renamed to "Accounts" (no suffix)', async () => {
      await expect(nc.itemByTitle('Auth')).toHaveCount(1);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Accounts'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Accounts1'))).toBe(false);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(false);
    });
  });

  test('renaming a subfolder to a sibling name suffixes within the parent directory', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-nested');

    await createCollection(page, 'Rename Nested', testDir, 'bru');
    await createFolder(page, 'Parent', 'Rename Nested');
    await sidebar.folder('Parent').dblclick();
    await createFolder(page, 'Alpha', 'Parent', false);
    await createFolder(page, 'Beta', 'Parent', false);
    await renameItemTo(page, 'Beta', 'Alpha', 'folder');

    await test.step('Two "Alpha" subfolders; directory suffixed within "Parent", old dir gone', async () => {
      await expect(nc.itemByTitle('Alpha')).toHaveCount(2);
      const parentDir = path.join(findCollectionDir(testDir), 'Parent');
      expect(fs.existsSync(path.join(parentDir, 'Alpha'))).toBe(true);
      expect(fs.existsSync(path.join(parentDir, 'Alpha1'))).toBe(true);
      expect(fs.existsSync(path.join(parentDir, 'Beta'))).toBe(false);
    });
  });

  test('renaming a folder to a reserved name is blocked and shows a validation error', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-reserved');

    await createCollection(page, 'Rename Folder Reserved', testDir, 'bru');
    await createFolder(page, 'Auth', 'Rename Folder Reserved');

    const modal = nc.modalByTitle('Rename Folder');

    await test.step('Open rename, set the name to reserved "CON", reveal filesystem name, submit', async () => {
      await openRenameModal(page, 'Auth', 'folder');
      await nc.renameNameInput().fill('CON');
      await revealFilesystemName(page);
      await nc.renameSubmit().click();
    });

    await test.step('Reserved-name error is shown and nothing is renamed', async () => {
      await expect(nc.toast('Name cannot be a reserved device name.')).toBeVisible();
      await expect(modal).toBeVisible();
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'CON'))).toBe(false);
    });

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0, { timeout: 5000 });
  });

  test('a nested request tab follows when its folder is renamed (identity preserved)', async ({ page, createTmpDir }) => {
    const { sidebar, tabs } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-tab');

    await createCollection(page, 'Rename Folder Tab', testDir, 'bru');
    await createFolder(page, 'Auth', 'Rename Folder Tab');
    await sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Auth', { inFolder: true });

    await test.step('Open the nested request, then rename the folder', async () => {
      await sidebar.folderRequest('Auth', 'login').dblclick();
      await expect(tabs.requestTab('login')).toBeVisible({ timeout: 5000 });
      await renameItemTo(page, 'Auth', 'Accounts', 'folder');
    });

    await test.step('Tab stays open and the request moved under the renamed folder', async () => {
      await expect(tabs.requestTab('login')).toBeVisible({ timeout: 5000 });
      await expect(tabs.requestTab('login')).toHaveCount(1);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Accounts', 'login.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(false);
    });
  });

  test('a case-only folder rename is applied in place without a suffix', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-case');

    await createCollection(page, 'Rename Folder Case', testDir, 'bru');
    await createFolder(page, 'auth', 'Rename Folder Case');
    await renameItemTo(page, 'auth', 'Auth', 'folder');

    await test.step('Renamed in place: single "Auth" in the sidebar, no suffixed variant', async () => {
      await expect(nc.itemByTitle('Auth')).toHaveCount(1);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth1'))).toBe(false);
      expect(fs.existsSync(path.join(collDir, 'auth1'))).toBe(false);
    });
  });

  test('renaming a folder to an existing name in a yml collection suffixes the directory', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-rename-yml');

    await createCollection(page, 'Rename Folder Yml', testDir, 'yml');
    await createFolder(page, 'Accounts', 'Rename Folder Yml');
    await createFolder(page, 'Auth', 'Rename Folder Yml');
    await renameItemTo(page, 'Auth', 'Accounts', 'folder');

    await test.step('Two "Accounts" entries; directory suffixed, old dir gone', async () => {
      await expect(nc.itemByTitle('Accounts')).toHaveCount(2);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Accounts'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Accounts1'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(false);
    });
  });
});
