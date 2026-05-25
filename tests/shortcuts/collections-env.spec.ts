import { test, expect, Page } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest as openRequestBase,
  closeAllCollections,
  createFolder,
  openCollection,
  selectRequestPaneTab
} from '../utils/page';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const collectionName = 'kb-collection';
const baseRequests = ['req-1', 'req-2', 'req-3', 'req-4', 'req-5', 'req-6', 'req-7', 'req-8', 'req-9'];

const setupBoundActionsData = async (page: Page, createTmpDir: (prefix: string) => Promise<string>) => {
  await closeAllCollections(page);
  const path = await createTmpDir('kb-collection-path');
  await createCollection(page, collectionName, path);

  await createFolder(page, 'kb-folder', collectionName, true);
  await createFolder(page, 'kb-draft-folder', collectionName, true);
  await createFolder(page, 'kb-terminal-folder', collectionName, true);
};

const checkIfRequestExists = async (page: Page, requestName: string) => {
  await openCollection(page, collectionName);
  const request = page.getByTestId('collections').locator('.collection-item-name').filter({ hasText: requestName }).first();
  return (await request.count()) > 0;
};

const openRequest = async (...args: Parameters<typeof openRequestBase>) => {
  const [page, targetCollectionName, requestName] = args;
  if (
    targetCollectionName === collectionName
    && baseRequests.includes(requestName)
    && !(await checkIfRequestExists(page, requestName))
  ) {
    await createRequest(page, requestName, targetCollectionName);
  }

  return openRequestBase(...args);
};

const openKeybindingsTab = async (page: Page) => {
  await page.getByRole('button', { name: 'Open Preferences' }).click();
  await page.getByRole('tab', { name: 'Keybindings' }).click();
  await expect(page.locator('.section-header').filter({ hasText: 'Keybindings' })).toBeVisible();
};

/**
 * Close the Preferences tab by clicking its close button.
 * Using the close button avoids depending on any keyboard shortcut that may
 * have just been reconfigured.
 */
const closePreferencesTab = async (page: Page) => {
  const prefTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
  await prefTab.hover();
  await prefTab.getByTestId('request-tab-close-icon').click({ force: true });
  await expect(prefTab).not.toBeVisible({ timeout: 8000 });
};

const closeTabByName = async (page: any, name: string | RegExp) => {
  const tab = page.locator('.request-tab').filter({ hasText: name });
  await tab.click();
  await tab.hover();
  await tab.getByTestId('request-tab-close-icon').click({ force: true });
  await expect(tab).not.toBeVisible({ timeout: 2000 });
};

const openFolderSettingsTab = async (page: Page, folderName: string) => {
  await openCollection(page, collectionName);
  const folderRow = page.locator('.collection-item-name').filter({ hasText: folderName }).first();
  await expect(folderRow).toBeVisible({ timeout: 5000 });
  await folderRow.dblclick();
  await expect(page.locator('.request-tab').filter({ hasText: folderName })).toBeVisible({ timeout: 3000 });
};

const reopenClosedTab = async (page: Page, shortcut: () => Promise<void>, expectedTabName: string | RegExp) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('.request-tab').first().click();
    await page.waitForTimeout(150);
    await shortcut();
    const reopenedTab = page.locator('.request-tab').filter({ hasText: expectedTabName });
    if ((await reopenedTab.count()) > 0) {
      await expect(reopenedTab).toBeVisible({ timeout: 3000 });
      return;
    }
    await page.waitForTimeout(200);
  }

  await expect(page.locator('.request-tab').filter({ hasText: expectedTabName })).toBeVisible({ timeout: 5000 });
};

const remapKeybinding = async (
  page: Page,
  action: string,
  pressShortcut: () => Promise<void>
) => {
  await openKeybindingsTab(page);
  const row = page.getByTestId(`keybinding-row-${action}`);
  await expect(row).toBeVisible({ timeout: 5000 });
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  const editButton = row.getByTestId(`keybinding-edit-${action}`);
  const keybindingInput = page.getByTestId(`keybinding-input-${action}`);

  if (await editButton.isVisible().catch(() => false)) {
    await editButton.click({ force: true });
  } else {
    await row.click({ force: true });
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click({ force: true });
    }
  }

  await expect(keybindingInput).toBeVisible({ timeout: 5000 });

  await page.keyboard.press('Backspace');
  await pressShortcut();
  await closePreferencesTab(page);
};

const getTabIndex = async (page: Page, name: string) => {
  const tabs = page.locator('.request-tab .tab-label');
  const count = await tabs.count();
  for (let i = 0; i < count; i++) {
    const text = (await tabs.nth(i).innerText()).trim();
    if (text.includes(name)) {
      return i;
    }
  }

  return -1;
};

// ─── Tests ────

test.describe('Shortcut Keys - BOUND_ACTIONS', () => {
  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 5000 });
    await setupBoundActionsData(page, createTmpDir);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.describe('COLLECTIONS & ENVIRONMENTS', () => {
    test.describe('SHORTCUT: Import Collection', () => {
      test('default Cmd/Ctrl+O open import collection modal', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await page.keyboard.press(`${modifier}+KeyO`);

        await expect(page.getByTestId('import-collection-modal')).toBeVisible({ timeout: 3000 });

        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible({ timeout: 3000 });
      });

      test('customized Alt+O open import collection modal', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap importCollection to Alt+O
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-importCollection');
        await row.hover();
        await page.getByTestId('keybinding-edit-importCollection').click();
        await expect(page.getByTestId('keybinding-input-importCollection')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyO');
        await page.keyboard.up('KeyO');
        await page.keyboard.up('Alt');

        // Trigger the remapped shortcut
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyO');
        await page.keyboard.up('KeyO');
        await page.keyboard.up('Alt');

        await expect(page.getByTestId('import-collection-modal')).toBeVisible({ timeout: 3000 });

        // Close the modal to leave a clean state for subsequent tests
        await page.getByTestId('modal-close-button').click();
        await expect(page.getByTestId('import-collection-modal')).not.toBeVisible({ timeout: 3000 });

        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Edit Environment (Cmd/Ctrl+E)', () => {
      test('open environment tab of collection Cmd/Ctrl+E', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await page.keyboard.down(modifier);
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up(modifier);

        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible({ timeout: 2000 });
      });

      test('open environment tab of collection customized Alt+E', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap editEnvironment to Alt+E
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-editEnvironment');
        await row.hover();
        await page.getByTestId('keybinding-edit-editEnvironment').click();
        await expect(page.getByTestId('keybinding-input-editEnvironment')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible({ timeout: 2000 });

        // Rest Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: Edit Environment (customized Alt+E)', () => {
      test('open environment tab of collection customized Alt+E', async ({ page, createTmpDir }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap editEnvironment to Alt+E
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-editEnvironment');
        await row.hover();
        await page.getByTestId('keybinding-edit-editEnvironment').click();
        await expect(page.getByTestId('keybinding-input-editEnvironment')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await openRequest(page, 'kb-collection', 'req-7', { persist: true });

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyE');
        await page.keyboard.up('KeyE');
        await page.keyboard.up('Alt');

        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible({ timeout: 2000 });

        // Rest Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });

    test.describe('SHORTCUT: New Request', () => {
      test('default Cmd/Ctrl+N opens new request modal for collection', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Focus the collection so the keybinding is active
        await page.locator('.collection-name').filter({ hasText: collectionName }).click();

        await page.keyboard.press(`${modifier}+KeyN`);

        await page.getByTestId('request-name').fill('nr-collection-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-collection-cenv' })).toBeVisible({ timeout: 2000 });
      });

      test('default Cmd/Ctrl+N opens new request modal for folder', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).click();

        await page.keyboard.press(`${modifier}+KeyN`);

        await page.getByTestId('request-name').fill('nr-folder-cenv');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-folder-cenv' })).toBeVisible({ timeout: 2000 });
      });

      test('customized Alt+N opens new request modal for collection', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        // Focus the collection so the keybinding is active
        await page.locator('.collection-name').filter({ hasText: collectionName }).click();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.getByTestId('request-name').fill('nr-collection-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-collection-cenv-altn' })).toBeVisible({ timeout: 2000 });

        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });

      test('customized Alt+N opens new request modal for folder', async ({ page }) => {
        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyY');
        await page.keyboard.up('KeyY');
        await page.keyboard.up('Alt');

        // Remap newRequest to Alt+N
        await openKeybindingsTab(page);
        const row = page.getByTestId('keybinding-row-newRequest');
        await row.hover();
        await page.getByTestId('keybinding-edit-newRequest').click();
        await expect(page.getByTestId('keybinding-input-newRequest')).toBeVisible({ timeout: 2000 });

        await page.keyboard.down('Backspace');

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        // Focus the folder so the keybinding is active
        await page.locator('.collection-item-name').filter({ hasText: 'kb-folder' }).click();

        await page.keyboard.down('Alt');
        await page.keyboard.down('KeyN');
        await page.keyboard.up('KeyN');
        await page.keyboard.up('Alt');

        await page.getByTestId('request-name').fill('nr-folder-cenv-altn');
        await page.getByTestId('new-request-url').locator('.CodeMirror').click();
        await page.keyboard.type('https://echo.usebruno.com');
        await page.getByTestId('create-new-request-button').click();

        await expect(page.locator('.request-tab').filter({ hasText: 'nr-folder-cenv-altn' })).toBeVisible({ timeout: 2000 });

        // Reset Default - just in case to not fail shortcuts in other places
        await openKeybindingsTab(page);
        await page.getByTestId('reset-all-keybindings-btn').click({ timeout: 2000 });
      });
    });
  });
});
