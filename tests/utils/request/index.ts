import { expect, Page } from '../../../playwright';
import { openCollectionSettings, openFolderSettings, selectCollectionPaneTab, selectfolderPaneTab } from '../page/actions';

// Moved to playwright/pages/request/. Re-exported here for existing imports.
export { buildRequestLocators } from '../../../playwright/pages/request/pane';
export { buildNewRequestLocators, createRequestFromCurl } from '../../../playwright/pages/request/create';
export type { CreateRequestFromCurlOptions } from '../../../playwright/pages/request/create';
export { fillRequestHeaderName, fillRequestHeaderValue, showInheritedHeaders } from '../../../playwright/pages/request/headers';
export { readResponsePreviewBody } from '../../../playwright/pages/response';
export { setApiKeyValue } from '../../../playwright/pages/request/auth';

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
