import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createRequest,
  createFolder,
  closeAllCollections,
  cloneItem
} from '../../utils/page';
import { listRequestFiles, findCollectionDir } from '../utils';

test.describe('Naming collisions - clone folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('clones a folder as "<name> copy" with its nested contents', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-clone-basic');

    await createCollection(page, 'Clone Folder', testDir, 'bru');
    await createFolder(page, 'Users', 'Clone Folder');
    await sidebar.folder('Users').dblclick(); // expand so items render
    await createRequest(page, 'login', 'Users', { inFolder: true });

    await cloneItem(page, 'Users');

    await test.step('Folder clone is one-click (no modal) and shows the "Users copy" folder', async () => {
      await expect(nc.anyModal()).toHaveCount(0);
      await expect(sidebar.folder('Users copy')).toBeVisible();
    });

    await test.step('On disk: "Users copy" dir exists with the nested request copied', async () => {
      const copyDir = path.join(findCollectionDir(testDir), 'Users copy');
      expect(fs.existsSync(copyDir)).toBe(true);
      expect(listRequestFiles(copyDir)).toContain('login.bru');
    });
  });

  test('cloning a folder twice keeps the display name and suffixes only the directory', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-clone-twice');

    await createCollection(page, 'Clone Folder Twice', testDir, 'bru');
    await createFolder(page, 'Users', 'Clone Folder Twice');

    await cloneItem(page, 'Users');
    await cloneItem(page, 'Users');

    await test.step('Sidebar shows two "Users copy" folders (duplicate display names allowed)', async () => {
      await expect(nc.itemByTitle('Users copy')).toHaveCount(2);
    });

    await test.step('On disk: display name preserved, directory names suffixed', async () => {
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Users copy'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Users copy1'))).toBe(true);
    });
  });

  test('cloning a folder copies nested subfolders too', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-clone-nested');

    await createCollection(page, 'Clone Nested', testDir, 'bru');
    await createFolder(page, 'Users', 'Clone Nested');
    await sidebar.folder('Users').dblclick();
    await createRequest(page, 'login', 'Users', { inFolder: true });
    await createFolder(page, 'Admin', 'Users', false); // subfolder inside "Users"

    await cloneItem(page, 'Users');

    await test.step('Sidebar shows "Users copy" with its nested request and subfolder', async () => {
      await expect(sidebar.folder('Users copy')).toBeVisible();
      await sidebar.folder('Users copy').dblclick(); // expand the clone
      await expect(sidebar.folderRequest('Users copy', 'login')).toBeVisible();
      await expect(sidebar.folderRequest('Users copy', 'Admin')).toBeVisible();
    });

    await test.step('On disk: the whole subtree is copied under "Users copy"', async () => {
      const copyDir = path.join(findCollectionDir(testDir), 'Users copy');
      expect(fs.existsSync(copyDir)).toBe(true);
      expect(listRequestFiles(copyDir)).toContain('login.bru');
      expect(fs.existsSync(path.join(copyDir, 'Admin'))).toBe(true);
    });
  });
});
