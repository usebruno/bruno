import process from 'node:process';
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
import { listRequestFiles } from '../utils';

// The clone shortcut is Cmd+D (mac) / Ctrl+D (win/linux).
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Naming collisions - clone request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('clones a request as "<name> copy" with no collision', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-basic');

    await createCollection(page, 'Clone Basic', testDir, 'bru');
    await createRequest(page, 'login', 'Clone Basic');

    await cloneItem(page, 'login');

    await test.step('Success toast is shown and the "login copy" clone appears', async () => {
      await expect(nc.toast('Request cloned!').first()).toBeVisible({ timeout: 5000 });
      await expect(sidebar.request('login copy')).toBeVisible();
    });

    await test.step('On disk: original + "login copy.bru" both exist', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });

  test('cloning twice keeps the display name and suffixes only the filename', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-twice');

    await createCollection(page, 'Clone Twice', testDir, 'bru');
    await createRequest(page, 'login', 'Clone Twice');

    await cloneItem(page, 'login');
    await expect(sidebar.request('login copy')).toBeVisible();
    await cloneItem(page, 'login');

    await test.step('Sidebar shows two "login copy" entries (duplicate display names allowed)', async () => {
      await expect(nc.itemByTitle('login copy')).toHaveCount(2);
    });

    await test.step('On disk: display name preserved, filesystem name suffixed', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy1.bru');
    });
  });

  test('cloning a "copy" appends another "copy"', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-append');

    await createCollection(page, 'Clone Append', testDir, 'bru');
    await createRequest(page, 'login copy', 'Clone Append');

    await cloneItem(page, 'login copy');

    await test.step('Sidebar shows "login copy copy" (appended, not deduped)', async () => {
      await expect(nc.itemByTitle('login copy copy')).toHaveCount(1);
    });

    await test.step('On disk: "login copy.bru" + "login copy copy.bru"', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy copy.bru');
    });
  });

  test('clones a request inside a folder, into the same folder', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-in-folder');

    await createCollection(page, 'Clone In Folder', testDir, 'bru');
    await createFolder(page, 'Auth', 'Clone In Folder');
    await sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Auth', { inFolder: true });

    await cloneItem(page, 'login');

    await test.step('Clone appears inside the same folder', async () => {
      await expect(sidebar.folderRequest('Auth', 'login copy')).toBeVisible();
    });

    await test.step('On disk: both files live under the "Auth" folder', async () => {
      const files = listRequestFiles(path.join(testDir, 'Clone In Folder', 'Auth'));
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });

  test('clones a request in a yml collection with a .yml file', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-yml');

    await createCollection(page, 'Clone Yml', testDir, 'yml');
    await createRequest(page, 'login', 'Clone Yml');

    await cloneItem(page, 'login');

    await test.step('Sidebar shows "login copy"', async () => {
      await expect(sidebar.request('login copy')).toBeVisible();
    });

    await test.step('On disk: clone is written as a .yml file', async () => {
      const files = listRequestFiles(testDir, '.yml');
      expect(files).toContain('login.yml');
      expect(files).toContain('login copy.yml');
    });
  });

  test('cloning a request never opens a modal', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-no-modal');

    await createCollection(page, 'Clone No Modal', testDir, 'bru');
    await createRequest(page, 'login', 'Clone No Modal');

    await cloneItem(page, 'login');

    await test.step('Clone completes without a modal', async () => {
      await expect(nc.anyModal()).toHaveCount(0);
      await expect(sidebar.request('login copy')).toBeVisible();
    });
  });

  test('preserves interior spaces in the copy name', async ({ page, createTmpDir }) => {
    const { namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-spaces');

    await createCollection(page, 'Clone Spaces', testDir, 'bru');
    await createRequest(page, 'My Request', 'Clone Spaces');

    await cloneItem(page, 'My Request');

    await test.step('Sidebar and disk keep the spaces (no slugging)', async () => {
      await expect(nc.itemByTitle('My Request copy')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('My Request.bru');
      expect(files).toContain('My Request copy.bru');
    });
  });

  test('clones a request via the keyboard shortcut', async ({ page, createTmpDir }) => {
    const { sidebar, namingCollisions: nc } = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-keybinding');

    await createCollection(page, 'Clone Keys', testDir, 'bru');
    await createRequest(page, 'login', 'Clone Keys');

    await test.step('Focus the "login" row and press the clone shortcut', async () => {
      await nc.itemRow('login').focus();
      await page.keyboard.down(modifier);
      await page.keyboard.press('d');
      await page.keyboard.up(modifier);
    });

    await test.step('Clone is created just like the menu path', async () => {
      await expect(nc.toast('Request cloned!').first()).toBeVisible({ timeout: 5000 });
      await expect(sidebar.request('login copy')).toBeVisible();
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });
});
