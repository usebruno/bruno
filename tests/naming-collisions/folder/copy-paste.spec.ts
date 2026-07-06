import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../../utils/page';
import { listRequestFiles, findCollectionDir } from '../utils';

/** Copy a folder via its sidebar actions menu. */
const copyFolder = async (page: Page, folderName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.folder(folderName).first().hover();
  await locators.actions.collectionItemActions(folderName).first().click();
  await locators.dropdown.item('Copy').click();
  await expect(page.getByText('Folder copied').first()).toBeVisible({ timeout: 5000 });
};

/** Paste into a collection's root via its actions menu. */
const pasteIntoCollection = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).hover();
  const action = locators.actions.collectionActions(collectionName);
  await expect(action).toBeVisible({ timeout: 5000 });
  await action.click();
  await locators.dropdown.item('Paste').click();
  await expect(page.getByText('Item pasted successfully').first()).toBeVisible({ timeout: 5000 });
};

/** Paste into a folder via its actions menu. */
const pasteIntoFolder = async (page: Page, folderName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.folder(folderName).first().hover();
  await locators.actions.collectionItemActions(folderName).first().click();
  await locators.dropdown.item('Paste').click();
  await expect(page.getByText('Item pasted successfully').first()).toBeVisible({ timeout: 5000 });
};

test.describe('Naming collisions - copy/paste folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('pasting a copied folder creates "<name> copy" with its nested contents', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-paste-basic');

    await createCollection(page, 'Paste Folder', testDir, 'bru');
    await createFolder(page, 'Users', 'Paste Folder');
    await locators.sidebar.folder('Users').dblclick(); // expand so items render
    await createRequest(page, 'login', 'Users', { inFolder: true });

    await test.step('Copy "Users" and paste into the collection', async () => {
      await copyFolder(page, 'Users');
      await pasteIntoCollection(page, 'Paste Folder');
    });

    await test.step('Sidebar shows "Users copy"; disk has the copied subtree', async () => {
      await expect(locators.sidebar.folder('Users copy')).toBeVisible();
      const copyDir = path.join(findCollectionDir(testDir), 'Users copy');
      expect(fs.existsSync(copyDir)).toBe(true);
      expect(listRequestFiles(copyDir)).toContain('login.bru');
    });
  });

  test('pasting a folder twice keeps the display name and suffixes the directory', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('folder-paste-twice');

    await createCollection(page, 'Paste Folder Twice', testDir, 'bru');
    await createFolder(page, 'Users', 'Paste Folder Twice');

    await test.step('Copy "Users" and paste it twice', async () => {
      await copyFolder(page, 'Users');
      await pasteIntoCollection(page, 'Paste Folder Twice'); // Users copy
      await pasteIntoCollection(page, 'Paste Folder Twice'); // Users copy (display) -> Users copy1 dir
    });

    await test.step('Two "Users copy" folders; directory names suffixed', async () => {
      await expect(page.locator('.item-name[title="Users copy"]')).toHaveCount(2);
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Users copy'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Users copy1'))).toBe(true);
    });
  });

  test('pasting a folder into a different parent still creates "<name> copy"', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('folder-paste-into-folder');

    await createCollection(page, 'Paste Folder Parent', testDir, 'bru');
    await createFolder(page, 'Users', 'Paste Folder Parent');
    await createFolder(page, 'Target', 'Paste Folder Parent');
    await locators.sidebar.folder('Target').dblclick();

    await test.step('Copy "Users" and paste into the "Target" folder', async () => {
      await copyFolder(page, 'Users');
      await pasteIntoFolder(page, 'Target');
    });

    await test.step('Copy lands inside "Target" as "Users copy"', async () => {
      const targetDir = path.join(findCollectionDir(testDir), 'Target');
      expect(fs.existsSync(path.join(targetDir, 'Users copy'))).toBe(true);
    });
  });
});
