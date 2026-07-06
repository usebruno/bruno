import process from 'node:process';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../../utils/page';
import { listRequestFiles } from '../utils';

// The clone shortcut is Cmd+D (mac) / Ctrl+D (win/linux).
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Naming collisions - clone request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('clones a request as "<name> copy" with no collision', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-basic');

    await createCollection(page, 'Clone Basic', testDir, 'bru');
    await createRequest(page, 'login', 'Clone Basic');

    await test.step('Clone the request via the sidebar menu', async () => {
      await locators.sidebar.request('login').hover();
      await locators.actions.collectionItemActions('login').click();
      await locators.dropdown.item('Clone').click();
    });

    await test.step('Success toast is shown (no modal)', async () => {
      await expect(page.getByText('Request cloned!')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Sidebar shows the "login copy" clone', async () => {
      await expect(locators.sidebar.request('login copy')).toBeVisible();
    });

    await test.step('On disk: original + "login copy.bru" both exist', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });

  test('cloning twice keeps the display name and suffixes only the filename', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-twice');

    await createCollection(page, 'Clone Twice', testDir, 'bru');
    await createRequest(page, 'login', 'Clone Twice');

    const cloneLogin = async () => {
      await locators.sidebar.request('login').first().hover();
      await locators.actions.collectionItemActions('login').first().click();
      await locators.dropdown.item('Clone').click();
      await expect(page.getByText('Request cloned!').first()).toBeVisible({ timeout: 5000 });
    };

    await test.step('Clone "login" the first time', async () => {
      await cloneLogin();
      await expect(locators.sidebar.request('login copy')).toBeVisible();
    });

    await test.step('Clone "login" a second time', async () => {
      await cloneLogin();
    });

    await test.step('Sidebar shows two "login copy" entries (duplicate display names allowed)', async () => {
      await expect(page.locator('.item-name[title="login copy"]')).toHaveCount(2);
    });

    await test.step('On disk: display name preserved, filesystem name suffixed', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy1.bru');
    });
  });

  test('cloning a "copy" appends another "copy"', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-append');

    await createCollection(page, 'Clone Append', testDir, 'bru');
    await createRequest(page, 'login copy', 'Clone Append');

    await test.step('Clone "login copy"', async () => {
      await locators.sidebar.request('login copy').hover();
      await locators.actions.collectionItemActions('login copy').click();
      await locators.dropdown.item('Clone').click();
      await expect(page.getByText('Request cloned!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Sidebar shows "login copy copy" (appended, not deduped)', async () => {
      await expect(page.locator('.item-name[title="login copy copy"]')).toHaveCount(1);
    });

    await test.step('On disk: "login copy.bru" + "login copy copy.bru"', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy copy.bru');
    });
  });

  test('clones a request inside a folder, into the same folder', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-in-folder');

    await createCollection(page, 'Clone In Folder', testDir, 'bru');
    await createFolder(page, 'Auth', 'Clone In Folder');

    await locators.sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Auth', { inFolder: true });

    await test.step('Clone the request inside the folder', async () => {
      await locators.sidebar.folderRequest('Auth', 'login').hover();
      await locators.actions.collectionItemActions('login').click();
      await locators.dropdown.item('Clone').click();
      await expect(page.getByText('Request cloned!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Clone appears inside the same folder', async () => {
      await expect(locators.sidebar.folderRequest('Auth', 'login copy')).toBeVisible();
    });

    await test.step('On disk: both files live under the "Auth" folder', async () => {
      const files = listRequestFiles(path.join(testDir, 'Clone In Folder', 'Auth'));
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });

  test('clones a request in a yml collection with a .yml file', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-yml');

    await createCollection(page, 'Clone Yml', testDir, 'yml');
    await createRequest(page, 'login', 'Clone Yml');

    await test.step('Clone the request', async () => {
      await locators.sidebar.request('login').hover();
      await locators.actions.collectionItemActions('login').click();
      await locators.dropdown.item('Clone').click();
      await expect(page.getByText('Request cloned!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Sidebar shows "login copy"', async () => {
      await expect(locators.sidebar.request('login copy')).toBeVisible();
    });

    await test.step('On disk: clone is written as a .yml file', async () => {
      const files = listRequestFiles(testDir, '.yml');
      expect(files).toContain('login.yml');
      expect(files).toContain('login copy.yml');
    });
  });

  test('cloning a request never opens a modal', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-no-modal');

    await createCollection(page, 'Clone No Modal', testDir, 'bru');
    await createRequest(page, 'login', 'Clone No Modal');

    await test.step('Clone the request', async () => {
      await locators.sidebar.request('login').hover();
      await locators.actions.collectionItemActions('login').click();
      await locators.dropdown.item('Clone').click();
    });

    await test.step('Clone completes without a modal', async () => {
      await expect(page.getByText('Request cloned!').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.bruno-modal')).toHaveCount(0);
      await expect(locators.sidebar.request('login copy')).toBeVisible();
    });
  });

  test('preserves interior spaces in the copy name', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-spaces');

    await createCollection(page, 'Clone Spaces', testDir, 'bru');
    await createRequest(page, 'My Request', 'Clone Spaces');

    await test.step('Clone "My Request"', async () => {
      await locators.sidebar.request('My Request').hover();
      await locators.actions.collectionItemActions('My Request').click();
      await locators.dropdown.item('Clone').click();
      await expect(page.getByText('Request cloned!').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Sidebar and disk keep the spaces (no slugging)', async () => {
      await expect(page.locator('.item-name[title="My Request copy"]')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('My Request.bru');
      expect(files).toContain('My Request copy.bru');
    });
  });

  test('clones a request via the keyboard shortcut', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('clone-request-keybinding');

    await createCollection(page, 'Clone Keys', testDir, 'bru');
    await createRequest(page, 'login', 'Clone Keys');

    await test.step('Focus the "login" row and press the clone shortcut', async () => {
      const row = page
        .locator('[data-testid="sidebar-collection-item-row"]')
        .filter({ has: page.locator('.item-name[title="login"]') });
      await row.focus();
      await page.keyboard.down(modifier);
      await page.keyboard.press('d');
      await page.keyboard.up(modifier);
    });

    await test.step('Clone is created just like the menu path', async () => {
      await expect(page.getByText('Request cloned!').first()).toBeVisible({ timeout: 5000 });
      await expect(locators.sidebar.request('login copy')).toBeVisible();
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });
});
