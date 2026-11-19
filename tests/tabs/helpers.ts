import fs from 'fs';
import path from 'path';
import { expect, Page } from '../../playwright';
import { editCodeMirrorEditor, fillRequestUrl, openEnvironmentSelector, openRequest, selectEnvironment, setEnvironmentVariableValue, switchToOpenTab } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

export const collectionName = 'tab-menu-collection';
export const fixtureCollectionPath = path.join(__dirname, 'fixtures', 'collection');

export const draftIndicator = (page: Page, name: string) => {
  const { tabs } = buildCommonLocators(page);
  return tabs.tabDraftIndicator(tabs.tabByName(name));
};

export const openRequests = async (page: Page, names: string[]) => {
  const { tabs } = buildCommonLocators(page);
  for (const name of names) {
    await openRequest(page, collectionName, name, { persist: true });
    await expect(tabs.tabByName(name)).toBeVisible();
  }
};

export const openCollectionSettingsWithDraft = async (page: Page) => {
  const { sidebar, paneTabs, tabs } = buildCommonLocators(page);
  await sidebar.collectionRow(collectionName).dblclick();
  await expect(tabs.collectionSettingsTab()).toBeVisible();
  await paneTabs.collectionSettingsTab('script').click();
  await paneTabs.tabTrigger('pre-request').click();
  await editCodeMirrorEditor(page, 'collection-pre-request-script-editor', '// draft');
  await expect(tabs.tabDraftIndicator(tabs.collectionSettingsTab())).toBeVisible();
};

export const openFolderSettingsWithDraft = async (page: Page) => {
  const { sidebar, paneTabs, tabs } = buildCommonLocators(page);
  const folderTab = tabs.tabByName('admin');
  await sidebar.folder('admin').dblclick();
  await expect(folderTab).toBeVisible();
  await paneTabs.folderSettingsTab('script').click();
  await paneTabs.tabTrigger('pre-request').click();
  await editCodeMirrorEditor(page, 'folder-pre-request-script-editor', '// draft');
  await expect(tabs.tabDraftIndicator(folderTab)).toBeVisible();
};

export const openEnvironmentWithDraft = async (page: Page, value: string) => {
  const { environment, tabs } = buildCommonLocators(page);
  await selectEnvironment(page, 'Local');
  await openEnvironmentSelector(page, 'collection');
  await environment.configureButton().click();
  await expect(environment.collectionEnvTab()).toBeVisible();
  await setEnvironmentVariableValue(page, 'host', value);
  await expect(tabs.tabCloseGradient(environment.collectionEnvTab())).toHaveClass(/has-changes/);
};

export const editRequestUrlWithoutSaving = async (page: Page, name: string, url: string) => {
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
  expect.poll(() => fs.readFileSync(path.join(collectionDir, relativePath), 'utf8'), { message: relativePath }).toContain(text);
