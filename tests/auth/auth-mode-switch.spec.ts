import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  createFolder,
  openRequest,
  readField,
  saveRequest,
  selectAuthMode,
  selectRequestPaneTab,
  typeIntoField
} from '../utils/page';

test.describe('Auth mode switch preserves saved data', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Request: switching back to the saved mode restores its credentials', async ({ page, createTmpDir }) => {
    await createCollection(page, 'auth-mode-switch-req', await createTmpDir());
    await createRequest(page, 'request-1', 'auth-mode-switch-req', { url: 'https://example.com/api' });
    await openRequest(page, 'auth-mode-switch-req', 'request-1');
    await selectRequestPaneTab(page, 'Auth');

    await test.step('Save Bearer with a token', async () => {
      await selectAuthMode(page, 'Bearer Token');
      await typeIntoField(page, 'Token', 'saved-bearer-token');
      await saveRequest(page);
    });

    await test.step('Bearer → Basic → Bearer restores the saved token (the bug fix)', async () => {
      await selectAuthMode(page, 'Basic Auth');
      await selectAuthMode(page, 'Bearer Token');

      await expect.poll(() => readField(page, 'Token')).toBe('saved-bearer-token');
    });

    await test.step('Switching to a non-saved mode shows empty fields (no regression)', async () => {
      await selectAuthMode(page, 'Basic Auth');

      await expect.poll(() => readField(page, 'Username')).toBe('');
      await expect.poll(() => readField(page, 'Password')).toBe('');
    });

    await test.step('Switching to a third unrelated mode also leaves fields empty', async () => {
      // Bearer is the saved mode; Digest has never been touched.
      await selectAuthMode(page, 'Digest Auth');

      await expect.poll(() => readField(page, 'Username')).toBe('');
      await expect.poll(() => readField(page, 'Password')).toBe('');
    });

    await test.step('Returning once more to Bearer still restores the saved token', async () => {
      await selectAuthMode(page, 'Bearer Token');
      await expect.poll(() => readField(page, 'Token')).toBe('saved-bearer-token');
    });
  });

  test('Collection: switching back to the saved mode restores its credentials', async ({ page, createTmpDir }) => {
    await createCollection(page, 'auth-mode-switch-col', await createTmpDir());

    // The collection settings tab opens automatically on creation.
    await page.locator('.tab.auth').click();

    await test.step('Save Bearer at the collection level', async () => {
      await selectAuthMode(page, 'Bearer Token');
      await typeIntoField(page, 'Token', 'collection-bearer-token');
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Bearer → Basic → Bearer restores the saved collection token', async () => {
      await selectAuthMode(page, 'Basic Auth');
      await selectAuthMode(page, 'Bearer Token');

      await expect.poll(() => readField(page, 'Token')).toBe('collection-bearer-token');
    });
  });

  test('Folder: switching back to the saved mode restores its credentials', async ({ page, createTmpDir }) => {
    await createCollection(page, 'auth-mode-switch-folder', await createTmpDir());
    await createFolder(page, 'folder-1', 'auth-mode-switch-folder', true);

    // Open the folder settings tab.
    await page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).dblclick();
    await page.locator('.tab.auth').click();

    await test.step('Save Bearer at the folder level', async () => {
      await selectAuthMode(page, 'Bearer Token');
      await typeIntoField(page, 'Token', 'folder-bearer-token');
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Bearer → Basic → Bearer restores the saved folder token', async () => {
      await selectAuthMode(page, 'Basic Auth');
      await selectAuthMode(page, 'Bearer Token');

      await expect.poll(() => readField(page, 'Token')).toBe('folder-bearer-token');
    });
  });
});
