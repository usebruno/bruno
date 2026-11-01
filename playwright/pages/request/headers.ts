import { expect, Page, Locator } from '../..';
import { buildRequestLocators } from './pane';
import { openCollectionSettings, selectCollectionPaneTab } from '../collection/settings';
import { openFolderSettings, selectfolderPaneTab } from '../folder/settings';

/**
 * Type a header name into an EditableTable Name cell (CodeMirror).
 */
export const fillRequestHeaderName = async (page: Page, row: Locator, name: string) => {
  const nameEditor = row.getByTestId('column-name').locator('.CodeMirror');
  await nameEditor.click();
  await page.keyboard.type(name);
};

/**
 * Type a header value into an EditableTable Value cell (CodeMirror).
 */
export const fillRequestHeaderValue = async (page: Page, row: Locator, value: string) => {
  const valueEditor = row.getByTestId('column-value').locator('.CodeMirror');
  await valueEditor.click();
  await page.keyboard.type(value);
};

/**
 * Reveal the Inherited Headers accordion (hidden by default) and return header locators.
 */
export const showInheritedHeaders = async (page: Page) => {
  const { headers } = buildRequestLocators(page);
  await headers.toggleInherited().click();
  await expect(headers.toggleInherited()).toHaveText('Hide Additional Headers');
  return headers;
};

type SettingsHeaderScope = 'collection' | 'folder';

const setSettingsHeadersBulk = async (page: Page, headersText: string, scope: SettingsHeaderScope) => {
  const content = page.getByTestId(
    scope === 'collection' ? 'collection-settings-content' : 'folder-settings-content'
  );
  const savedMessage = scope === 'collection'
    ? 'Collection Settings saved successfully'
    : 'Folder Settings saved successfully';

  await content.getByTestId('bulk-edit-toggle').click();
  const editor = content.locator('.CodeMirror').first();
  await expect(editor).toBeVisible();
  await editor.evaluate((el, text) => {
    const cm = (el as { CodeMirror?: { setValue: (value: string) => void } }).CodeMirror;
    if (!cm) throw new Error('No CodeMirror in settings headers bulk editor');
    cm.setValue(text);
  }, headersText);
  await content.getByTestId('key-value-edit-toggle').click();
  await content.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(savedMessage)).toBeVisible({ timeout: 5000 });
};

/**
 * Write collection headers via Bulk Edit and save.
 */
export const seedCollectionHeaders = async (page: Page, collectionName: string, headersText: string) => {
  await openCollectionSettings(page, collectionName);
  await selectCollectionPaneTab(page, 'headers');
  await setSettingsHeadersBulk(page, headersText, 'collection');
};

/**
 * Write folder headers via Bulk Edit and save.
 */
export const seedFolderHeaders = async (
  page: Page,
  collectionName: string,
  folderName: string,
  headersText: string
) => {
  await openFolderSettings(page, collectionName, folderName);
  await selectfolderPaneTab(page, 'headers');
  await setSettingsHeadersBulk(page, headersText, 'folder');
};
