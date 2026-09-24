import { expect, test } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createRequest,
  expandFolder,
  openCollectionSettings,
  openRequest
} from '../utils/page';
import {
  collectionName,
  fillAndCreateNewRequest,
  focusTabWithoutSidebarFocus,
  modifier,
  openFolderSettingsTab,
  pressShortcut,
  resetKeybindings,
  setupBoundActionsData
} from './helpers';

test.describe('Shortcut Keys - New Request from active tab', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetKeybindings(page);
    await closeAllCollections(page);
  });

  test('Cmd/Ctrl+N from a root request tab creates at collection root', async ({ pageWithUserData: page }) => {
    await test.step('Arrange: open a root-level request and clear sidebar focus', async () => {
      await createRequest(page, 'root-req', collectionName);
      await openRequest(page, collectionName, 'root-req', { persist: true });
      await focusTabWithoutSidebarFocus(page, 'root-req');
    });

    await test.step('Act: newRequest shortcut from the active tab', async () => {
      await pressShortcut(page, modifier, 'KeyN');
      await fillAndCreateNewRequest(page, 'from-root-tab');
    });

    await test.step('Assert: request lands at collection root', async () => {
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.request('from-root-tab')).toBeVisible();
      await expect(locators.sidebar.folderRequest('kb-folder', 'from-root-tab')).toHaveCount(0);
    });
  });

  test('Cmd/Ctrl+N from a nested request tab creates in the parent folder', async ({ pageWithUserData: page }) => {
    await test.step('Arrange: request inside kb-folder, tab focused', async () => {
      await expandFolder(page, 'kb-folder');
      await createRequest(page, 'nested-req', 'kb-folder', { inFolder: true });
      await openRequest(page, collectionName, 'nested-req', { persist: true });
      await focusTabWithoutSidebarFocus(page, 'nested-req');
    });

    await test.step('Act: newRequest shortcut from the active tab', async () => {
      await pressShortcut(page, modifier, 'KeyN');
      await fillAndCreateNewRequest(page, 'from-nested-tab');
    });

    await test.step('Assert: request lands under parent folder', async () => {
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.folderRequest('kb-folder', 'from-nested-tab')).toBeVisible();
    });
  });

  test('Cmd/Ctrl+N from folder-settings tab creates in that folder', async ({ pageWithUserData: page }) => {
    await test.step('Arrange: open folder settings and clear sidebar focus', async () => {
      await openFolderSettingsTab(page, 'kb-folder');
      await focusTabWithoutSidebarFocus(page, 'kb-folder');
    });

    await test.step('Act: newRequest shortcut from folder-settings tab', async () => {
      await pressShortcut(page, modifier, 'KeyN');
      await fillAndCreateNewRequest(page, 'from-folder-settings');
    });

    await test.step('Assert: request lands under that folder', async () => {
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.folderRequest('kb-folder', 'from-folder-settings')).toBeVisible();
    });
  });

  test('Cmd/Ctrl+N from collection-settings tab creates at collection root', async ({ pageWithUserData: page }) => {
    await test.step('Arrange: open collection settings and clear sidebar focus', async () => {
      await openCollectionSettings(page, collectionName, { persist: true });
      await focusTabWithoutSidebarFocus(page, 'Collection');
    });

    await test.step('Act: newRequest shortcut from collection-settings tab', async () => {
      await pressShortcut(page, modifier, 'KeyN');
      await fillAndCreateNewRequest(page, 'from-collection-settings');
    });

    await test.step('Assert: request lands at collection root', async () => {
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.request('from-collection-settings')).toBeVisible();
      await expect(locators.sidebar.folderRequest('kb-folder', 'from-collection-settings')).toHaveCount(0);
    });
  });

  test('Cmd/Ctrl+N yields to sidebar when a folder is focused', async ({ pageWithUserData: page }) => {
    await test.step('Arrange: active request tab + sidebar folder focus', async () => {
      await createRequest(page, 'yield-req', collectionName);
      await openRequest(page, collectionName, 'yield-req', { persist: true });
      const locators = buildCommonLocators(page);
      await locators.tabs.requestTab('yield-req').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('yield-req');

      // Focus folder in sidebar — tab handler must yield (focusedSidebarPath truthy).
      await locators.sidebar.folder('kb-folder').click();
    });

    await test.step('Act: newRequest shortcut while folder is focused', async () => {
      await pressShortcut(page, modifier, 'KeyN');
      await fillAndCreateNewRequest(page, 'from-sidebar-folder');
    });

    await test.step('Assert: request created in focused folder (sidebar wins)', async () => {
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.folderRequest('kb-folder', 'from-sidebar-folder')).toBeVisible();
    });
  });
});
