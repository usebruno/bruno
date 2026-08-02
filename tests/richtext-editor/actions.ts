import { expect, Page } from '../../playwright';
import { createCollection, createFolder, openCollectionSettings, openFolderSettings, selectCollectionPaneTab, selectfolderPaneTab } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

export const setupRequestDocs = async (page: Page, createTmpDir: (tag?: string) => Promise<string>, collectionName: string) => {
  const tmpDir = await createTmpDir(collectionName);
  const locators = buildCommonLocators(page);
  await createCollection(page, collectionName, tmpDir);
  await locators.sidebar.collection(collectionName).hover();
  await locators.actions.collectionActions(collectionName).click();
  await locators.dropdown.item('New Request').click();
  await page.getByTestId('request-name').fill('test-req');
  await locators.modal.button('Create').click();
  await locators.modal.backdrop().waitFor({ state: 'hidden' });
  await expect(locators.tabs.requestTab('test-req')).toBeVisible();

  await page.waitForSelector('.request-pane');

  const docsTab = locators.docs.docsTab();
  const moreTabs = locators.docs.moreTabs();
  await expect(docsTab.or(moreTabs)).toBeVisible();

  if (await docsTab.isVisible()) {
    await docsTab.click();
  } else {
    await moreTabs.click();
    await locators.dropdown.item('Docs').click();
  }
  const editBtn = locators.docs.editToggle();
  await editBtn.waitFor({ state: 'visible', timeout: 5000 });
  // The docs toolbar only renders while in edit mode, so its visibility is a
  // more robust "are we editing?" signal than the toggle button's label text.
  const isEditing = await page.locator('.docs-tab-strip').isVisible();
  if (!isEditing) {
    await editBtn.click();
  }

  return locators;
};

export const setupCollectionDocs = async (page: Page, createTmpDir: (tag?: string) => Promise<string>, collectionName: string) => {
  const tmpDir = await createTmpDir(collectionName);
  const locators = buildCommonLocators(page);
  await createCollection(page, collectionName, tmpDir);
  await openCollectionSettings(page, collectionName);
  await selectCollectionPaneTab(page, 'overview');

  const editBtn = locators.docs.collectionDocsEditToggle();
  await editBtn.waitFor({ state: 'visible', timeout: 5000 });
  const isEditing = await page.locator('.docs-tab-strip').isVisible();
  if (!isEditing) {
    await editBtn.click();
  }

  return locators;
};

export const setupFolderDocs = async (page: Page, createTmpDir: (tag?: string) => Promise<string>, collectionName: string, folderName = 'test-folder') => {
  const tmpDir = await createTmpDir(collectionName);
  const locators = buildCommonLocators(page);
  await createCollection(page, collectionName, tmpDir);
  await createFolder(page, folderName, collectionName);
  await openFolderSettings(page, collectionName, folderName);
  await selectfolderPaneTab(page, 'docs');

  const editBtn = locators.docs.folderDocsEditToggle();
  await editBtn.waitFor({ state: 'visible', timeout: 5000 });
  const isEditing = await page.locator('.docs-tab-strip').isVisible();
  if (!isEditing) {
    await editBtn.click();
  }

  return locators;
};

type DocsLocators = ReturnType<typeof buildCommonLocators>;

// Sets the Markdown-mode CodeMirror value directly instead of typing, so a
// multi-line markdown fixture (headings, lists, tables, ...) lands verbatim
// without CodeMirror's list/indent auto-formatting rewriting it as it's typed.
export const setMarkdownSource = async (locators: DocsLocators, markdown: string) => {
  await locators.docs.modeSwitchMarkdown().click();
  const codeEditor = locators.docs.codeEditor();
  await expect(codeEditor).toBeVisible();
  await codeEditor.evaluate((el, value) => {
    (el.closest('.CodeMirror') as any).CodeMirror.setValue(value);
  }, markdown);
};

export const getMarkdownSource = async (locators: DocsLocators): Promise<string> => {
  await locators.docs.modeSwitchMarkdown().click();
  const codeEditor = locators.docs.codeEditor();
  await expect(codeEditor).toBeVisible();
  return codeEditor.evaluate((el) => (el.closest('.CodeMirror') as any).CodeMirror.getValue());
};
