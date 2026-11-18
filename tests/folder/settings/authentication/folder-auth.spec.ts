import path from 'path';
import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  fieldEditor,
  openCollectionFromDialog,
  openfolder,
  readField,
  selectAuthMode,
  selectfolderPaneTab,
  typeIntoField
} from '../../../utils/page';
import { AUTH_MODE_LABELS } from '../../../utils/constants';

const COLLECTION_NAME = 'auth-configure';
const FOLDER_NAME = 'configure-folder';
const FOLDER_TOKEN = 'your_secret_token';
const FOLDER_USERNAME = 'folder-user';
const FOLDER_PASSWORD = 'folder-password';

test.describe('Configure authentication on a folder', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-521: Verify that user is able to configure Bearer Token Authentication for a folder', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const { auth, settingsSaveButton, toast } = buildCommonLocators(page);

    await openCollectionFromDialog(page, electronApp, path.join(collectionFixturePath!, COLLECTION_NAME));
    await openfolder(page, COLLECTION_NAME, FOLDER_NAME, { persist: true });
    await test.step('Select Bearer Token on the folder Auth tab', async () => {
      await selectfolderPaneTab(page, 'auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
      await auth.modeLabel().filter({ hasText: AUTH_MODE_LABELS.BEARER }).waitFor();
      await fieldEditor(page, 'Token').waitFor();
    });

    await test.step('Enter the Bearer token and save', async () => {
      await typeIntoField(page, 'Token', FOLDER_TOKEN);
      await settingsSaveButton().click();
    });

    await test.step('Folder settings save Bearer Token as the active method', async () => {
      await expect(toast.byMessage('Folder Settings saved successfully')).toBeVisible();
      await expect(auth.modeLabel()).toHaveText(AUTH_MODE_LABELS.BEARER);
      await expect.poll(() => readField(page, 'Token')).toBe(FOLDER_TOKEN);
    });
  });

  test('TC-508: Verify that Configuring Basic Authentication for a folder', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const { auth, settingsSaveButton, toast } = buildCommonLocators(page);

    await openCollectionFromDialog(page, electronApp, path.join(collectionFixturePath!, COLLECTION_NAME));
    await openfolder(page, COLLECTION_NAME, FOLDER_NAME, { persist: true });
    await test.step('Select Basic Auth on the folder Auth tab', async () => {
      await selectfolderPaneTab(page, 'auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.BASIC);
      await auth.modeLabel().filter({ hasText: AUTH_MODE_LABELS.BASIC }).waitFor();
      await fieldEditor(page, 'Username').waitFor();
      await fieldEditor(page, 'Password').waitFor();
    });

    await test.step('Enter the username and password and save', async () => {
      await typeIntoField(page, 'Username', FOLDER_USERNAME);
      await typeIntoField(page, 'Password', FOLDER_PASSWORD);
      await settingsSaveButton().click();
    });

    await test.step('Folder settings save Basic Auth with the password masked', async () => {
      await expect(toast.byMessage('Folder Settings saved successfully')).toBeVisible();
      await expect(auth.modeLabel()).toHaveText(AUTH_MODE_LABELS.BASIC);
      await expect.poll(() => readField(page, 'Username')).toBe(FOLDER_USERNAME);
      await expect.poll(() => readField(page, 'Password')).toBe(FOLDER_PASSWORD);
    });
  });
});
