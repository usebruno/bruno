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

  test('pasting twice keeps the display name and suffixes the file', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-twice');

    await createCollection(page, 'Paste Twice', testDir, 'bru');
    await createRequest(page, 'login', 'Paste Twice');

    await copyItem(page, 'login');
    await pasteIntoCollection(page, 'Paste Twice'); // login copy
    await pasteIntoCollection(page, 'Paste Twice'); // login copy (display) -> login copy1.bru

    await test.step('Two "login copy" entries; filesystem name suffixed', async () => {
      await expect(nc.itemByTitle('login copy')).toHaveCount(2);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy1.bru');
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

  test('pasting into the same folder twice suffixes within that folder', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-folder-twice');

    await createCollection(page, 'Paste Folder Twice', testDir, 'bru');
    await createFolder(page, 'Auth', 'Paste Folder Twice');
    await sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Paste Folder Twice');

    await copyItem(page, 'login');
    await pasteIntoFolder(page, 'Auth');
    await pasteIntoFolder(page, 'Auth');

    await test.step('Two "login copy" in the folder; second file suffixed', async () => {
      const files = listRequestFiles(path.join(testDir, 'Paste Folder Twice', 'Auth'));
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy1.bru');
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
