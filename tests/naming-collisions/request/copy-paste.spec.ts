import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createFolder, closeAllCollections } from '../../utils/page';
import { listRequestFiles } from '../utils';

const copyRequest = async (page: Page, name: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.request(name).first().hover();
  await locators.actions.collectionItemActions(name).first().click();
  await locators.dropdown.item('Copy').click();
  await expect(page.getByText('Request copied').first()).toBeVisible({ timeout: 5000 });
};

const pasteIntoCollection = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).hover();
  const action = locators.actions.collectionActions(collectionName);
  await expect(action).toBeVisible({ timeout: 5000 });
  await action.click();
  await locators.dropdown.item('Paste').click();
  await expect(page.getByText('Item pasted successfully').first()).toBeVisible({ timeout: 5000 });
};

const pasteIntoFolder = async (page: Page, folderName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.folder(folderName).first().hover();
  await locators.actions.collectionItemActions(folderName).first().click();
  await locators.dropdown.item('Paste').click();
  await expect(page.getByText('Item pasted successfully').first()).toBeVisible({ timeout: 5000 });
};

test.describe('Naming collisions - copy/paste request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('pasting a copied request creates "<name> copy"', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-basic');

    await createCollection(page, 'Paste Basic', testDir, 'bru');
    await createRequest(page, 'login', 'Paste Basic');

    await test.step('Copy "login" and paste into the collection', async () => {
      await copyRequest(page, 'login');
      await pasteIntoCollection(page, 'Paste Basic');
    });

    await test.step('Sidebar and disk show the "login copy"', async () => {
      await expect(locators.sidebar.request('login copy')).toBeVisible();
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
    });
  });

  test('pasting twice keeps the display name and suffixes the file', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('paste-twice');

    await createCollection(page, 'Paste Twice', testDir, 'bru');
    await createRequest(page, 'login', 'Paste Twice');

    await test.step('Copy "login" and paste it twice', async () => {
      await copyRequest(page, 'login');
      await pasteIntoCollection(page, 'Paste Twice'); // login copy
      await pasteIntoCollection(page, 'Paste Twice'); // login copy (display) -> login copy1.bru
    });

    await test.step('Two "login copy" entries; filesystem name suffixed', async () => {
      await expect(page.locator('.item-name[title="login copy"]')).toHaveCount(2);
      const files = listRequestFiles(testDir);
      expect(files).toContain('login.bru');
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy1.bru');
    });
  });

  test('pasting into a different folder still creates "<name> copy"', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-into-folder');

    await createCollection(page, 'Paste Folder', testDir, 'bru');
    await createFolder(page, 'Auth', 'Paste Folder');
    await locators.sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Paste Folder');

    await test.step('Copy "login" (root) and paste into the "Auth" folder', async () => {
      await copyRequest(page, 'login');
      await pasteIntoFolder(page, 'Auth');
    });

    await test.step('Copy lands inside "Auth" as "login copy"', async () => {
      await expect(locators.sidebar.folderRequest('Auth', 'login copy')).toBeVisible();
      const files = listRequestFiles(path.join(testDir, 'Paste Folder', 'Auth'));
      expect(files).toContain('login copy.bru');
    });
  });

  test('pasting into the same folder twice suffixes within that folder', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-folder-twice');

    await createCollection(page, 'Paste Folder Twice', testDir, 'bru');
    await createFolder(page, 'Auth', 'Paste Folder Twice');
    await locators.sidebar.folder('Auth').dblclick();
    await createRequest(page, 'login', 'Paste Folder Twice');

    await test.step('Copy "login" (root) and paste into "Auth" twice', async () => {
      await copyRequest(page, 'login');
      await pasteIntoFolder(page, 'Auth');
      await pasteIntoFolder(page, 'Auth');
    });

    await test.step('Two "login copy" in the folder; second file suffixed', async () => {
      const files = listRequestFiles(path.join(testDir, 'Paste Folder Twice', 'Auth'));
      expect(files).toContain('login copy.bru');
      expect(files).toContain('login copy1.bru');
    });
  });

  test('copy/paste in a yml collection writes a .yml file', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('paste-yml');

    await createCollection(page, 'Paste Yml', testDir, 'yml');
    await createRequest(page, 'login', 'Paste Yml');

    await test.step('Copy "login" and paste into the collection', async () => {
      await copyRequest(page, 'login');
      await pasteIntoCollection(page, 'Paste Yml');
    });

    await test.step('On disk: the paste is written as a .yml file', async () => {
      await expect(locators.sidebar.request('login copy')).toBeVisible();
      const files = listRequestFiles(testDir, '.yml');
      expect(files).toContain('login.yml');
      expect(files).toContain('login copy.yml');
    });
  });
});
