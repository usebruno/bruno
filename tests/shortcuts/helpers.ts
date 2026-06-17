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

export const setupBoundActionsData = async (page: Page, createTmpDir: (prefix: string) => Promise<string>) => {
  console.log('helpers-setupBoundActionsData-1');
  await closeAllCollections(page);
  console.log('helpers-setupBoundActionsData-2');
  const path = await createTmpDir('kb-collection-path');
  console.log('helpers-setupBoundActionsData-3');
  await createCollection(page, collectionName, path);

  console.log('helpers-setupBoundActionsData-4');
  await createFolder(page, 'kb-folder', collectionName, true);
  console.log('helpers-setupBoundActionsData-5');
  await createFolder(page, 'kb-draft-folder', collectionName, true);
  console.log('helpers-setupBoundActionsData-6');
  await createFolder(page, 'kb-terminal-folder', collectionName, true);
};

const checkIfRequestExists = async (page: Page, requestName: string) => {
  console.log('helpers-checkIfRequestExists-1');
  await openCollection(page, collectionName);
  console.log('helpers-checkIfRequestExists-2');
  const request = page.getByTestId('collections').locator('.collection-item-name').filter({ has: page.getByText(requestName, { exact: true }) });
  console.log('helpers-checkIfRequestExists-3');
  return (await request.count()) > 0;
};

export const openRequest = async (...args: Parameters<typeof openRequestBase>) => {
  console.log('helpers-openRequest-1');
  const [page, targetCollectionName, requestName] = args;
  console.log('helpers-openRequest-2');
  if (
    targetCollectionName === collectionName
    && baseRequests.includes(requestName)
    && !(await checkIfRequestExists(page, requestName))
  ) {
    console.log('helpers-openRequest-3');
    await createRequest(page, requestName, targetCollectionName);
  }

  console.log('helpers-openRequest-4');
  return openRequestBase(...args);
};

export const openKeybindingsTab = async (page: Page) => {
  console.log('helpers-openKeybindingsTab-1');
  await page.getByRole('button', { name: 'Open Preferences' }).click();
  console.log('helpers-openKeybindingsTab-2');
  await page.getByRole('tab', { name: 'Keybindings' }).click();
  console.log('helpers-openKeybindingsTab-3');
  await expect(page.locator('.section-header').filter({ has: page.getByText('Keybindings', { exact: true }) })).toBeVisible();
};

/**
 * Close the Preferences tab by clicking its close button.
 * Using the close button avoids depending on any keyboard shortcut that may
 * have just been reconfigured.
 */
export const closePreferencesTab = async (page: Page) => {
  console.log('helpers-closePreferencesTab-1');
  const prefTab = page.locator('.request-tab').filter({ has: page.getByText('Preferences', { exact: true }) });
  console.log('helpers-closePreferencesTab-2');
  await prefTab.dblclick();
  console.log('helpers-closePreferencesTab-3');
  await prefTab.getByTestId('request-tab-close-icon').click({ force: true });

  console.log('helpers-closePreferencesTab-4');
  await expect(prefTab).not.toBeVisible({ timeout: 8000 });
};

export const closeTabByName = async (page: any, name: string | RegExp) => {
  console.log('helpers-closeTabByName-1');
  const tab = page.locator('.request-tab').filter({ has: page.getByText(name, { exact: true }) });
  console.log('helpers-closeTabByName-2');
  await tab.dblclick();
  console.log('helpers-closeTabByName-3');
  await tab.hover();
  console.log('helpers-closeTabByName-4');
  await tab.getByTestId('request-tab-close-icon').click({ force: true });
  console.log('helpers-closeTabByName-5');
  await expect(tab).not.toBeVisible({ timeout: 2000 });
};

export const openFolderSettingsTab = async (page: Page, folderName: string) => {
  console.log('helpers-openFolderSettingsTab-1');
  await openCollection(page, collectionName);
  console.log('helpers-openFolderSettingsTab-2');
  const folderRow = page.locator('.collection-item-name').filter({ has: page.getByText(folderName, { exact: true }) });
  console.log('helpers-openFolderSettingsTab-3');
  await expect(folderRow).toBeVisible({ timeout: 5000 });
  console.log('helpers-openFolderSettingsTab-4');
  await folderRow.dblclick();
  console.log('helpers-openFolderSettingsTab-5');
  await expect(page.locator('.request-tab').filter({ has: page.getByText(folderName, { exact: true }) })).toBeVisible({ timeout: 3000 });
};

export const reopenClosedTab = async (page: Page, shortcut: () => Promise<void>, expectedTabName: string | RegExp) => {
  console.log('helpers-reopenClosedTab-1');
  for (let attempt = 0; attempt < 3; attempt++) {
    console.log('helpers-reopenClosedTab-2');
    await page.locator('.request-tab').first().click();
    console.log('helpers-reopenClosedTab-3');
    await page.waitForTimeout(500);
    console.log('helpers-reopenClosedTab-4');
    await shortcut();
    console.log('helpers-reopenClosedTab-5');
    const reopenedTab = page.locator('.request-tab').filter({ has: page.getByText(expectedTabName, { exact: true }) });
    console.log('helpers-reopenClosedTab-6');
    if ((await reopenedTab.count()) > 0) {
      console.log('helpers-reopenClosedTab-7');
      await expect(reopenedTab).toBeVisible({ timeout: 3000 });
      console.log('helpers-reopenClosedTab-8');
      return;
    }
    console.log('helpers-reopenClosedTab-9');
    await page.waitForTimeout(200);
  }

  console.log('helpers-reopenClosedTab-10');
  await expect(page.locator('.request-tab').filter({ has: page.getByText(expectedTabName, { exact: true }) })).toBeVisible({ timeout: 5000 });
};

export const remapKeybinding = async (
  page: Page,
  action: string,
  pressShortcut: () => Promise<void>
) => {
  console.log('helpers-remapKeybinding-1');
  await openKeybindingsTab(page);
  console.log('helpers-remapKeybinding-2');
  const row = page.getByTestId(`keybinding-row-${action}`);
  console.log('helpers-remapKeybinding-3');
  await expect(row).toBeVisible({ timeout: 5000 });
  console.log('helpers-remapKeybinding-4');
  await row.scrollIntoViewIfNeeded();
  console.log('helpers-remapKeybinding-5');
  await row.hover();
  console.log('helpers-remapKeybinding-6');
  const editButton = row.getByTestId(`keybinding-edit-${action}`);
  console.log('helpers-remapKeybinding-7');
  const keybindingInput = page.getByTestId(`keybinding-input-${action}`);

  console.log('helpers-remapKeybinding-8');
  if (await editButton.isVisible().catch(() => false)) {
    console.log('helpers-remapKeybinding-9');
    await editButton.click({ force: true });
  } else {
    console.log('helpers-remapKeybinding-10');
    await row.click({ force: true });
    console.log('helpers-remapKeybinding-11');
    if (await editButton.isVisible().catch(() => false)) {
      console.log('helpers-remapKeybinding-12');
      await editButton.click({ force: true });
    }
  }

  console.log('helpers-remapKeybinding-13');
  await expect(keybindingInput).toBeVisible({ timeout: 5000 });

  console.log('helpers-remapKeybinding-14');
  await page.keyboard.press('Backspace');
  console.log('helpers-remapKeybinding-15');
  await pressShortcut();
};

export const getTabIndex = async (page: Page, name: string) => {
  console.log('helpers-getTabIndex-1');
  const tabs = page.locator('.request-tab .tab-label');
  console.log('helpers-getTabIndex-2');
  const count = await tabs.count();
  console.log('helpers-getTabIndex-3');
  for (let i = 0; i < count; i++) {
    console.log('helpers-getTabIndex-4');
    const text = (await tabs.nth(i).innerText()).trim();
    console.log('helpers-getTabIndex-5');
    if (text.includes(name)) {
      console.log('helpers-getTabIndex-6');
      return i;
    }
  }

  console.log('helpers-getTabIndex-7');
  return -1;
};
