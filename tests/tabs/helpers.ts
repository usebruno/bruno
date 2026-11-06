import fs from 'fs';
import path from 'path';
import { expect, Locator, Page } from '../../playwright';
import { editCodeMirrorEditor, fillRequestUrl, openEnvironmentSelector, openRequest, selectEnvironment, switchToOpenTab } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

export const collectionName = 'tab-menu-collection';
export const fixtureCollectionPath = path.join(__dirname, 'fixtures', 'collection');

const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

export const tab = (page: Page, name: string) => buildCommonLocators(page).tabs.tabByName(name);
export const draftIndicator = (page: Page, name: string) => buildCommonLocators(page).tabs.tabDraftIndicator(tab(page, name));
export const unsavedModal = (page: Page) => buildCommonLocators(page).unsavedChangesModal;

// Collection settings, folder settings and the environment editor have no tab menu of their
// own, but they sit in the same tab strip, so a request tab's Close Left / Right sweeps them up.
export const collectionTab = (page: Page) => buildCommonLocators(page).tabs.collectionSettingsTab();
export const folderTab = (page: Page) => tab(page, 'admin');
export const environmentTab = (page: Page) => buildCommonLocators(page).environment.collectionEnvTab();
export const settingsTabDraftIndicator = (page: Page, settingsTab: Locator) => buildCommonLocators(page).tabs.tabDraftIndicator(settingsTab);
export const environmentTabCloseGradient = (page: Page) => buildCommonLocators(page).tabs.tabCloseGradient(environmentTab(page));

export const openRequests = async (page: Page, names: string[]) => {
  for (const name of names) {
    await openRequest(page, collectionName, name, { persist: true });
    await expect(tab(page, name)).toBeVisible({ timeout: 3000 });
  }
};

export const openCollectionSettingsWithDraft = async (page: Page) => {
  const { sidebar, paneTabs } = buildCommonLocators(page);
  await sidebar.collectionRow(collectionName).dblclick();
  await expect(collectionTab(page)).toBeVisible({ timeout: 3000 });
  await paneTabs.collectionSettingsTab('script').click();
  await paneTabs.tabTrigger('pre-request').click();
  await editCodeMirrorEditor(page, 'collection-pre-request-script-editor', '// draft');
  await expect(settingsTabDraftIndicator(page, collectionTab(page))).toBeVisible();
};

export const openFolderSettingsWithDraft = async (page: Page) => {
  await buildCommonLocators(page).sidebar.folder('admin').dblclick();
  await expect(folderTab(page)).toBeVisible({ timeout: 3000 });
  const { paneTabs } = buildCommonLocators(page);
  await paneTabs.folderSettingsTab('script').click();
  await paneTabs.tabTrigger('pre-request').click();
  await editCodeMirrorEditor(page, 'folder-pre-request-script-editor', '// draft');
  await expect(settingsTabDraftIndicator(page, folderTab(page))).toBeVisible();
};

export const openEnvironmentWithDraft = async (page: Page, value: string) => {
  const { environment } = buildCommonLocators(page);
  await selectEnvironment(page, 'Local');
  await openEnvironmentSelector(page, 'collection');
  await environment.configureButton().click();
  await expect(environmentTab(page)).toBeVisible({ timeout: 3000 });
  await environment.variableValue('host').click();
  await page.keyboard.press(selectAllShortcut);
  await page.keyboard.type(value);
  await expect(environmentTabCloseGradient(page)).toHaveClass(/has-changes/);
};

export const draftRequestUrl = async (page: Page, name: string, url: string) => {
  await switchToOpenTab(page, name);
  await fillRequestUrl(page, url);
  await expect(draftIndicator(page, name)).toBeVisible();
};

// Cancel and Don't Save must leave the collection on disk exactly as the fixture shipped it.
export const expectCollectionFilesUnchanged = (collectionDir: string) => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
  for (const fixtureFile of walk(fixtureCollectionPath)) {
    const relativePath = path.relative(fixtureCollectionPath, fixtureFile);
    expect(fs.readFileSync(path.join(collectionDir, relativePath), 'utf8'), relativePath).toBe(fs.readFileSync(fixtureFile, 'utf8'));
  }
};

// Saves land on disk asynchronously, so poll the file rather than read it once.
export const expectCollectionFileToContain = (collectionDir: string, relativePath: string, text: string) =>
  expect.poll(() => fs.readFileSync(path.join(collectionDir, relativePath), 'utf8'), { message: relativePath, timeout: 3000 }).toContain(text);
