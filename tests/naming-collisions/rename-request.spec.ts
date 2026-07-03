import process from 'node:process';
import * as path from 'path';
import { test, expect, Page } from '../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../utils/page';
import { listRequestFiles } from './utils';

const openRenameModal = async (page: Page, currentName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.request(currentName).first().hover();
  await locators.actions.collectionItemActions(currentName).first().click();
  await locators.dropdown.item('Rename').click();
  const modal = page.locator('.bruno-modal').filter({ hasText: 'Rename Request' });
  await modal.waitFor({ state: 'visible' });
  return modal;
};

const renameItemTo = async (page: Page, currentName: string, newName: string) => {
  const modal = await openRenameModal(page, currentName);
  await page.locator('#collection-item-name').fill(newName);
  await page.getByTestId('rename-item-button').click();
  await expect(modal).toHaveCount(0, { timeout: 5000 });
};

const renameViaEditedFilename = async (page: Page, currentName: string, newFilename: string) => {
  const modal = await openRenameModal(page, currentName);
  await modal.locator('.btn-advanced').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }).click();
  await page.getByTestId('rename-request-edit-icon').click();
  await page.locator('#file-name').fill(newFilename);
  await page.getByTestId('rename-item-button').click();
  await expect(modal).toHaveCount(0, { timeout: 5000 });
};

test.describe('Naming collisions - rename request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('renaming to a free name changes both the display name and the file', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('rename-free');

    await createCollection(page, 'Rename Free', testDir, 'bru');
    await createRequest(page, 'login', 'Rename Free');

    await test.step('Rename "login" to "signin"', async () => {
      await renameItemTo(page, 'login', 'signin');
      await expect(page.getByText('Item renamed successfully').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Sidebar and disk reflect the new name; old file is gone', async () => {
      await expect(page.locator('.item-name[title="signin"]')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('signin.bru');
      expect(files).not.toContain('login.bru');
    });
  });

  test('renaming to an existing name keeps the display name and suffixes the file', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('rename-collision');

    await createCollection(page, 'Rename Collision', testDir, 'bru');
    await createRequest(page, 'signin', 'Rename Collision'); // signin.bru exists
    await createRequest(page, 'login', 'Rename Collision');

    await test.step('Rename "login" to the already-taken "signin"', async () => {
      await renameItemTo(page, 'login', 'signin');
      await expect(page.getByText('Item renamed successfully').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Two "signin" entries shown; file silently suffixed, old file gone', async () => {
      await expect(page.locator('.item-name[title="signin"]')).toHaveCount(2);
      const files = listRequestFiles(testDir);
      expect(files).toContain('signin.bru');
      expect(files).toContain('signin1.bru');
      expect(files).not.toContain('login.bru');
    });
  });

  test('an open tab follows the rename (identity preserved)', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('rename-open-tab');

    await createCollection(page, 'Rename Open Tab', testDir, 'bru');
    await createRequest(page, 'login', 'Rename Open Tab');

    await test.step('Open the request in a tab', async () => {
      await locators.sidebar.request('login').dblclick();
      await expect(locators.tabs.requestTab('login')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Rename it to "signin"', async () => {
      await renameItemTo(page, 'login', 'signin');
    });

    await test.step('The same tab now shows the new name (not a new tab)', async () => {
      await expect(locators.tabs.requestTab('signin')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.request-tab .tab-label').filter({ hasText: /^login$/ })).toHaveCount(0);
      const files = listRequestFiles(testDir);
      expect(files).toContain('signin.bru');
      expect(files).not.toContain('login.bru');
    });
  });

  test('renaming to a reserved name is blocked and shows a validation error', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('rename-invalid');

    await createCollection(page, 'Rename Invalid', testDir, 'bru');
    await createRequest(page, 'login', 'Rename Invalid');

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Rename Request' });

    await test.step('Open rename, set the name to reserved "CON", reveal filesystem name, submit', async () => {
      await locators.sidebar.request('login').first().hover();
      await locators.actions.collectionItemActions('login').first().click();
      await locators.dropdown.item('Rename').click();
      await modal.waitFor({ state: 'visible' });

      await page.locator('#collection-item-name').fill('CON');
      // Reveal the filesystem-name section so its validation error renders.
      await modal.locator('.btn-advanced').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }).click();
      await page.getByTestId('rename-item-button').click();
    });

    await test.step('Reserved-name error is shown and nothing is renamed', async () => {
      await expect(page.getByText('Name cannot be a reserved device name.')).toBeVisible();
      await expect(modal).toBeVisible();
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).not.toContain('CON.bru');
    });

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0, { timeout: 5000 });
  });

  test('renaming to an existing name in a yml collection suffixes the .yml file', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('rename-collision-yml');

    await createCollection(page, 'Rename Yml', testDir, 'yml');
    await createRequest(page, 'signin', 'Rename Yml'); // signin.yml exists
    await createRequest(page, 'login', 'Rename Yml');

    await test.step('Rename "login" to the already-taken "signin"', async () => {
      await renameItemTo(page, 'login', 'signin');
    });

    await test.step('On disk: both .yml, second suffixed, old file gone', async () => {
      await expect(page.locator('.item-name[title="signin"]')).toHaveCount(2);
      const files = listRequestFiles(testDir, '.yml');
      expect(files).toContain('signin.yml');
      expect(files).toContain('signin1.yml');
      expect(files).not.toContain('login.yml');
    });
  });

  test('editing only the filename to a free name renames the file, keeps the display name', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('rename-filename-free');

    await createCollection(page, 'Rename Fn Free', testDir, 'bru');
    await createRequest(page, 'login', 'Rename Fn Free');

    await test.step('Edit the filesystem name to "signin" (leave display name "login")', async () => {
      await renameViaEditedFilename(page, 'login', 'signin');
    });

    await test.step('Display name stays "login"; file is renamed to signin.bru', async () => {
      await expect(page.locator('.item-name[title="login"]')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('signin.bru');
      expect(files).not.toContain('login.bru');
    });
  });

  test('editing only the filename to an existing name suffixes the file, keeps the display name', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('rename-filename-collision');

    await createCollection(page, 'Rename Fn Collision', testDir, 'bru');
    await createRequest(page, 'signin', 'Rename Fn Collision'); // signin.bru exists
    await createRequest(page, 'login', 'Rename Fn Collision');

    await test.step('Edit the filesystem name of "login" to the taken "signin"', async () => {
      await renameViaEditedFilename(page, 'login', 'signin');
    });

    await test.step('Display name stays "login"; file silently suffixed', async () => {
      await expect(page.locator('.item-name[title="login"]')).toHaveCount(1);
      const files = listRequestFiles(testDir);
      expect(files).toContain('signin.bru');
      expect(files).toContain('signin1.bru');
      expect(files).not.toContain('login.bru');
    });
  });

  test('renaming to an existing name inside a folder suffixes within that folder', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('rename-collision-in-folder');

    await createCollection(page, 'Rename In Folder', testDir, 'bru');
    await createFolder(page, 'Auth', 'Rename In Folder');
    await locators.sidebar.folder('Auth').dblclick();
    await createRequest(page, 'signin', 'Auth', { inFolder: true });
    await createRequest(page, 'login', 'Auth', { inFolder: true });

    await test.step('Rename "login" to the taken "signin" inside the folder', async () => {
      await renameItemTo(page, 'login', 'signin');
    });

    await test.step('On disk: both files under "Auth", second suffixed, old file gone', async () => {
      const files = listRequestFiles(path.join(testDir, 'Rename In Folder', 'Auth'));
      expect(files).toContain('signin.bru');
      expect(files).toContain('signin1.bru');
      expect(files).not.toContain('login.bru');
    });
  });

  test('renaming to a case-variant of an existing name behaves per filesystem case-sensitivity', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('rename-case');

    await createCollection(page, 'Rename Case', testDir, 'bru');
    await createRequest(page, 'login', 'Rename Case'); // login.bru
    await createRequest(page, 'signin', 'Rename Case'); // signin.bru

    await test.step('Rename "signin" to "Login" (a case variant of the existing "login")', async () => {
      await renameItemTo(page, 'signin', 'Login');
    });

    await test.step('Both display names shown; disk depends on FS case-sensitivity', async () => {
      await expect(page.locator('.item-name[title="login"]')).toHaveCount(1);
      await expect(page.locator('.item-name[title="Login"]')).toHaveCount(1);

      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).not.toContain('signin.bru'); // renamed away
      if (process.platform === 'linux') {
        // Case-sensitive: "Login.bru" is a distinct free name, no suffix.
        expect(files).toContain('Login.bru');
      } else {
        // Case-insensitive (macOS/Windows): "Login.bru" collides with "login.bru" -> suffixed.
        expect(files).toContain('Login1.bru');
      }
      expect(files).toHaveLength(2);
    });
  });
});
