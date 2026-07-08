import { expect, Page } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  openCollection,
  openRequest as openRequestBase
} from '../utils/page';

export const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
export const collectionName = 'kb-collection';
export const baseRequests = ['req-1', 'req-2', 'req-3', 'req-4', 'req-5', 'req-6', 'req-7', 'req-8', 'req-9'];

export const pressShortcut = async (page: Page, ...keys: string[]) => {
  for (const key of keys) {
    await page.keyboard.down(key);
  }
  for (const key of [...keys].reverse()) {
    await page.keyboard.up(key);
  }
};

export const setupBoundActionsData = async (page: Page, createTmpDir: (prefix: string) => Promise<string>) => {
  await closeAllCollections(page);
  const path = await createTmpDir('kb-collection-path');
  await createCollection(page, collectionName, path);

  await createFolder(page, 'kb-folder', collectionName, true);
  await createFolder(page, 'kb-draft-folder', collectionName, true);
  await createFolder(page, 'kb-terminal-folder', collectionName, true);
};

const checkIfRequestExists = async (page: Page, requestName: string) => {
  await openCollection(page, collectionName);
  const request = page.getByTestId('collections').locator('.collection-item-name').filter({ has: page.getByText(requestName, { exact: true }) });
  return (await request.count()) > 0;
};

export const openRequest = async (...args: Parameters<typeof openRequestBase>) => {
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

export const openKeybindingsTab = async (page: Page) => {
  await page.getByRole('button', { name: 'Open Preferences' }).click();
  await page.getByRole('tab', { name: 'Keybindings' }).click();
  await expect(page.locator('.section-header').filter({ has: page.getByText('Keybindings', { exact: true }) })).toBeVisible();
};

export const closePreferencesTab = async (page: Page) => {
  const prefTab = page.locator('.request-tab').filter({ has: page.getByText('Preferences', { exact: true }) });
  // Nothing to do if it's already closed.
  if (!(await prefTab.isVisible().catch(() => false))) return;

  await expect(async () => {
    await prefTab.hover();
    await prefTab.getByTestId('request-tab-close-icon').click({ force: true });
    await expect(prefTab).not.toBeVisible();
  }).toPass({ timeout: 10000 });
};

export const resetKeybindings = async (page: Page) => {
  await openKeybindingsTab(page);
  const resetBtn = page.getByTestId('reset-all-keybindings-btn');

  if (await resetBtn.isEnabled().catch(() => false)) {
    await resetBtn.click({ timeout: 2000 });
  }
  await closePreferencesTab(page);
};

export const closeTabByName = async (page: any, name: string | RegExp) => {
  const tab = page.locator('.request-tab').filter({ has: page.getByText(name, { exact: true }) });
  await tab.dblclick();
  await tab.hover();
  await tab.getByTestId('request-tab-close-icon').click({ force: true });
  await expect(tab).not.toBeVisible();
};

export const openFolderSettingsTab = async (page: Page, folderName: string) => {
  await openCollection(page, collectionName);
  const folderRow = page.locator('.collection-item-name').filter({ has: page.getByText(folderName, { exact: true }) });
  await expect(folderRow).toBeVisible();
  await folderRow.dblclick();
  await expect(page.locator('.request-tab').filter({ has: page.getByText(folderName, { exact: true }) })).toBeVisible();
};

export const reopenClosedTab = async (page: Page, shortcut: () => Promise<void>, expectedTabName: string | RegExp) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('.request-tab').first().click();
    // Wait for a tab to become active (focus settled) before firing the shortcut.
    await expect(page.locator('.request-tab.active')).toBeVisible();
    await shortcut();
    const reopenedTab = page.locator('.request-tab').filter({ has: page.getByText(expectedTabName, { exact: true }) });
    if ((await reopenedTab.count()) > 0) {
      await expect(reopenedTab).toBeVisible();
      return;
    }
    // Event-driven backoff: give the reopened tab a chance to appear before retrying.
    await reopenedTab.waitFor({ state: 'visible', timeout: 1000 }).catch(() => { });
  }

  await expect(page.locator('.request-tab').filter({ has: page.getByText(expectedTabName, { exact: true }) })).toBeVisible();
};

export const remapKeybinding = async (
  page: Page,
  action: string,
  ...keys: string[]
) => {
  await openKeybindingsTab(page);
  const row = page.getByTestId(`keybinding-row-${action}`);
  await expect(row).toBeVisible();
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

  await expect(keybindingInput).toBeVisible();

  await page.keyboard.press('Backspace');
  await pressShortcut(page, ...keys);
  await closePreferencesTab(page);
};

export const getTabIndex = async (page: Page, name: string) => {
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
