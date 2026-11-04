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
import { listRequestFiles } from '../utils';

test.describe('Naming collisions - copy/paste request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('pasting a copied request creates "<name> copy"', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-basic');

    await createCollection(page, 'Paste Basic', testDir, 'bru');
    await createRequest(page, 'login', 'Paste Basic');

    await copyItem(page, 'login');
    await pasteIntoCollection(page, 'Paste Basic');

    await test.step('Sidebar and disk show the "login copy"', async () => {
      await expect(sidebar.request('login copy')).toBeVisible();
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });

  test('pasting twice numbers the display name', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-twice');

    await createCollection(page, 'Paste Twice', testDir, 'bru');
    await createRequest(page, 'login', 'Paste Twice');

    await copyItem(page, 'login');
    await pasteIntoCollection(page, 'Paste Twice'); // login copy
    await expect(sidebar.request('login copy')).toBeVisible();
    await pasteIntoCollection(page, 'Paste Twice'); // login copy 2

    await test.step('"login copy" and "login copy 2"', async () => {
      await expect(sidebar.itemByName('login copy')).toHaveCount(1);
      await expect(sidebar.itemByName('login copy 2')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy 2.bru');
    });
  });

  test('pasting into a different folder still creates "<name> copy"', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-into-folder');

    await createCollection(page, 'Paste Folder', testDir, 'bru');
    await createFolder(page, 'Auth', 'Paste Folder');
    await sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Paste Folder');

    await copyItem(page, 'login');
    await pasteIntoFolder(page, 'Auth');

    await test.step('Copy lands inside "Auth" as "login copy"', async () => {
      await expect(sidebar.folderRequest('Auth', 'login copy')).toBeVisible();
      const files = listRequestFiles(path.join(testDir, 'Paste Folder', 'Auth'));
      expect(files).toContain('login copy.bru');
    });
  });

  test('pasting into the same folder twice numbers within that folder', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-folder-twice');

    await createCollection(page, 'Paste Folder Twice', testDir, 'bru');
    await createFolder(page, 'Auth', 'Paste Folder Twice');
    await sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Paste Folder Twice');

    await copyItem(page, 'login');
    await pasteIntoFolder(page, 'Auth');
    await expect(sidebar.folderRequest('Auth', 'login copy')).toBeVisible();
    await pasteIntoFolder(page, 'Auth');

    await test.step('"login copy" and "login copy 2" in the folder', async () => {
      await expect(sidebar.folderRequest('Auth', 'login copy 2')).toBeVisible();
      const files = listRequestFiles(path.join(testDir, 'Paste Folder Twice', 'Auth'));
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy 2.bru');
    });
  });

  test('copy/paste in a yml collection writes a .yml file', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-yml');

    await createCollection(page, 'Paste Yml', testDir, 'yml');
    await createRequest(page, 'login', 'Paste Yml');

    await copyItem(page, 'login');
    await pasteIntoCollection(page, 'Paste Yml');

    await test.step('On disk: the paste is written as a .yml file', async () => {
      await expect(sidebar.request('login copy')).toBeVisible();
      const files = listRequestFiles(testDir, '.yml');
      expect(files).toContain('login.yml');
      expect(files).toContain('login copy.yml');
    });
  });
});
