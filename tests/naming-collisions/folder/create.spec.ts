import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, createCollection, createFolder, closeAllCollections } from '../../utils/page';
import { findCollectionDir } from '../utils';

const openNewFolderModal = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).hover();
  const action = locators.actions.collectionActions(collectionName);
  await expect(action).toBeVisible({ timeout: 5000 });
  await action.click();
  await locators.dropdown.item('New Folder').click();
};

const createFolderViaModal = async (page: Page, collectionName: string, folderName: string) => {
  const locators = buildCommonLocators(page);
  await openNewFolderModal(page, collectionName);
  await page.getByTestId('new-folder-input').fill(folderName);
  await locators.modal.button('Create').click();
  await expect(page.locator('.bruno-modal')).toHaveCount(0, { timeout: 5000 });
};

test.describe('Naming collisions - create folder', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('creating a folder with an existing name keeps the name and suffixes the directory', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('folder-create-dup');

    await createCollection(page, 'Create Folder Dup', testDir, 'bru');
    await createFolder(page, 'Auth', 'Create Folder Dup');
    await createFolderViaModal(page, 'Create Folder Dup', 'Auth');

    await test.step('Sidebar shows two "Auth" folders (duplicate display names allowed)', async () => {
      await expect(page.locator('.item-name[title="Auth"]')).toHaveCount(2);
    });

    await test.step('On disk: typed name preserved, second directory silently suffixed', async () => {
      const collDir = findCollectionDir(testDir);
      expect(fs.existsSync(path.join(collDir, 'Auth'))).toBe(true);
      expect(fs.existsSync(path.join(collDir, 'Auth1'))).toBe(true);
    });
  });

  test('creating a folder with a reserved name is blocked and creates nothing', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('folder-create-reserved');

    await createCollection(page, 'Create Folder Reserved', testDir, 'bru');

    const modal = page.locator('.bruno-modal');

    await test.step('Enter reserved name "CON", reveal filesystem name, submit', async () => {
      await openNewFolderModal(page, 'Create Folder Reserved');
      await page.getByTestId('new-folder-input').fill('CON');
      // Reveal the filesystem-name section so its validation error renders.
      await modal.locator('.btn-advanced').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }).click();
      await buildCommonLocators(page).modal.button('Create').click();
    });

    await test.step('Reserved-name error is shown and nothing is created', async () => {
      await expect(page.getByText('Name cannot be a reserved device name.')).toBeVisible();
      await expect(modal).toBeVisible();
      await expect(page.locator('.item-name[title="CON"]')).toHaveCount(0);
      expect(fs.existsSync(path.join(findCollectionDir(testDir), 'CON'))).toBe(false);
    });

    // Close the modal so afterEach isn't blocked by the backdrop.
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0, { timeout: 5000 });
  });
});
