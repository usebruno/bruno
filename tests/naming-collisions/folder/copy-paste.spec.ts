import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createRequest,
  createFolder,
  closeAllCollections,
  copyItem,
  pasteIntoCollection,
  pasteIntoFolder
} from '../../utils/page';
import { listRequestFiles, findCollectionDir } from '../utils';

test.describe('Naming collisions - copy/paste folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('pasting a copied folder creates "<name> copy" with its nested contents', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-paste-basic');

    await createCollection(page, 'Paste Folder', testDir, 'bru');
    await createFolder(page, 'Users', 'Paste Folder');
    await sidebar.folder('Users').dblclick(); // expand so items render
    await createRequest(page, 'login', 'Users', { inFolder: true });

    await copyItem(page, 'Users');
    await pasteIntoCollection(page, 'Paste Folder');

    await test.step('Sidebar shows "Users copy"; disk has the copied subtree', async () => {
      await expect(sidebar.folder('Users copy')).toBeVisible();
      const copyDir = path.join(findCollectionDir(testDir), 'Users copy');
      expect(fs.existsSync(copyDir)).toBe(true);
      expect(listRequestFiles(copyDir)).toContain('login.bru');
    });
  });

  test('pasting a folder twice keeps the display name and suffixes the directory', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-paste-twice');

    await createCollection(page, 'Paste Folder Twice', testDir, 'bru');
    await createFolder(page, 'Users', 'Paste Folder Twice');

    await copyItem(page, 'Users');
    await pasteIntoCollection(page, 'Paste Folder Twice'); // Users copy
    await pasteIntoCollection(page, 'Paste Folder Twice'); // Users copy (display) -> Users copy1 dir

    await test.step('Two "Users copy" folders; directory names suffixed', async () => {
      await expect(nc.itemByTitle('Users copy')).toHaveCount(2);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Users copy'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Users copy1'))).toBe(true);
    });
  });

  test('pasting a folder into a different parent still creates "<name> copy"', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-paste-into-folder');

    await createCollection(page, 'Paste Folder Parent', testDir, 'bru');
    await createFolder(page, 'Users', 'Paste Folder Parent');
    await createFolder(page, 'Target', 'Paste Folder Parent');
    await sidebar.folder('Target').dblclick();

    await copyItem(page, 'Users');
    await pasteIntoFolder(page, 'Target');

    await test.step('Copy lands inside "Target" as "Users copy"', async () => {
      await expect(sidebar.folderRequest('Target', 'Users copy')).toBeVisible();
      const targetDir = path.join(findCollectionDir(testDir), 'Target');
      expect(fs.existsSync(path.join(targetDir, 'Users copy'))).toBe(true);
    });
  });
});
