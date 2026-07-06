import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../../utils/page';
import { listRequestFiles, findCollectionDir } from '../utils';

const cloneFolder = async (page: Page, folderName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.folder(folderName).first().hover();
  await locators.actions.collectionItemActions(folderName).first().click();
  await locators.dropdown.item('Clone').click();
  await expect(page.getByText('Folder cloned!').first()).toBeVisible({ timeout: 5000 });
};

test.describe('Naming collisions - clone folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('clones a folder as "<name> copy" with its nested contents', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-clone-basic');

    await createCollection(page, 'Clone Folder', testDir, 'bru');
    await createFolder(page, 'Users', 'Clone Folder');
    await locators.sidebar.folder('Users').dblclick(); // expand so items render
    await createRequest(page, 'login', 'Users', { inFolder: true });

    await test.step('Clone the "Users" folder', async () => {
      await cloneFolder(page, 'Users');
    });

    await test.step('Folder clone is one-click: no modal appears (modal is collection-only)', async () => {
      await expect(page.locator('.bruno-modal')).toHaveCount(0);
    });

    await test.step('Sidebar shows the "Users copy" folder', async () => {
      await expect(locators.sidebar.folder('Users copy')).toBeVisible();
    });

    await test.step('On disk: "Users copy" dir exists with the nested request copied', async () => {
      const collDir = findCollectionDir(testDir);
      const copyDir = path.join(collDir, 'Users copy');
      expect(fs.existsSync(copyDir)).toBe(true);
      expect(listRequestFiles(copyDir)).toContain('login.bru');
    });
  });

  test('cloning a folder twice keeps the display name and suffixes only the directory', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('folder-clone-twice');

    await createCollection(page, 'Clone Folder Twice', testDir, 'bru');
    await createFolder(page, 'Users', 'Clone Folder Twice');

    await test.step('Clone "Users" twice', async () => {
      await cloneFolder(page, 'Users');
      await cloneFolder(page, 'Users');
    });

    await test.step('Sidebar shows two "Users copy" folders (duplicate display names allowed)', async () => {
      await expect(page.locator('.item-name[title="Users copy"]')).toHaveCount(2);
    });

    await test.step('On disk: display name preserved, directory names suffixed', async () => {
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Users copy'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Users copy1'))).toBe(true);
    });
  });

  test('cloning a folder copies nested subfolders too', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-clone-nested');

    await createCollection(page, 'Clone Nested', testDir, 'bru');
    await createFolder(page, 'Users', 'Clone Nested');
    await locators.sidebar.folder('Users').dblclick();
    await createRequest(page, 'login', 'Users', { inFolder: true });
    await createFolder(page, 'Admin', 'Users', false); // subfolder inside "Users"

    await test.step('Clone the "Users" folder', async () => {
      await cloneFolder(page, 'Users');
    });

    await test.step('On disk: the whole subtree is copied under "Users copy"', async () => {
      const collDir = findCollectionDir(testDir);
      const copyDir = path.join(collDir, 'Users copy');
      expect(fs.existsSync(copyDir)).toBe(true);
      expect(listRequestFiles(copyDir)).toContain('login.bru');
      expect(fs.existsSync(path.join(copyDir, 'Admin'))).toBe(true);
    });
  });
});
