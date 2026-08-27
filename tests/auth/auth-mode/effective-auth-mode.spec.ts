import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, createCollection, createFolder, selectAuthMode } from '../../utils/page';
import { AUTH_MODE_LABELS } from '../../utils/constants';

test.describe('Effective auth mode resolution', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Nested folder with Inherit should pick up its immediate parent folder, not a grandparent', async ({ page, createTmpDir }) => {
    const collectionName = 'effective-auth-mode-collection';
    const locators = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, await createTmpDir());
    });

    await test.step('Create folder-1 inside the collection and set auth type for folder-1 as Bearer Token', async () => {
      await createFolder(page, 'folder-1', collectionName, true);
      await locators.sidebar.folder('folder-1').dblclick();
      await locators.paneTabs.folderSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Create folder-2 inside folder-1 and set auth type for folder-2 as Basic Auth', async () => {
      await createFolder(page, 'folder-2', 'folder-1', false);
      await locators.sidebar.folder('folder-2').dblclick();
      await locators.paneTabs.folderSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.BASIC);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Create folder-3 inside folder-2 and set auth type for folder-3 as Inherit', async () => {
      await createFolder(page, 'folder-3', 'folder-2', false);
      await locators.sidebar.folder('folder-3').dblclick();
      await locators.paneTabs.folderSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.INHERIT);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify folder-3 should inherit auth from folder-2', async () => {
      await expect(page.getByText('Auth inherited from folder-2:')).toBeVisible();
      await expect(locators.auth.inheritedMode()).toHaveText(AUTH_MODE_LABELS.BASIC);
    });
  });

  test('Child folder with Inherit should pick up parent folder set to No Auth (not fall through to collection)', async ({ page, createTmpDir }) => {
    const collectionName = 'no-auth-inherit-collection';
    const locators = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, await createTmpDir());
    });

    await test.step('Set auth type for the collection as Basic Auth', async () => {
      await locators.paneTabs.collectionSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.BASIC);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Create folder-1 inside the collection and set auth type for folder-1 as No Auth', async () => {
      await createFolder(page, 'folder-1', collectionName, true);
      await locators.sidebar.folder('folder-1').dblclick();
      await locators.paneTabs.folderSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Create folder-2 inside folder-1 and set auth type for folder-2 as Inherit', async () => {
      await createFolder(page, 'folder-2', 'folder-1', false);
      await locators.sidebar.folder('folder-2').dblclick();
      await locators.paneTabs.folderSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.INHERIT);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify folder-2 should inherit No Auth from folder-1 (not fall through to the collection)', async () => {
      await expect(page.getByText('Auth inherited from folder-1:')).toBeVisible();
      await expect(locators.auth.inheritedMode()).toHaveText(AUTH_MODE_LABELS.NONE);
    });
  });

  test('Auth dropdown shows No Auth as the selected option after picking it', async ({ page, createTmpDir }) => {
    const collectionName = 'no-auth-dropdown-collection';
    const locators = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, await createTmpDir());
    });

    await test.step('Create folder-1 inside the collection and set auth type for folder-1 as No Auth', async () => {
      await createFolder(page, 'folder-1', collectionName, true);
      await locators.sidebar.folder('folder-1').dblclick();
      await locators.paneTabs.folderSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify the auth mode selector shows No Auth as the current mode', async () => {
      await expect(locators.auth.modeSelector()).toContainText(AUTH_MODE_LABELS.NONE);
    });

    await test.step('Reopen the dropdown and verify No Auth is highlighted as the selected option', async () => {
      await page.locator('.auth-mode-label').first().click();
      // Bruno marks the selected dropdown item with the `dropdown-item-active` class.
      const noAuthItem = locators.auth.dropdownItem('none');
      await expect(noAuthItem).toBeVisible();
      await expect(noAuthItem).toHaveClass(/dropdown-item-active/);
      await expect(noAuthItem).toContainText(AUTH_MODE_LABELS.NONE);
    });
  });
});
