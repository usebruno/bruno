import { test, expect, Page, Locator } from '../../../playwright';
import {
  openCollectionSettings,
  openFolderSettings,
  selectAuthMode,
  selectCollectionPaneTab,
  selectfolderPaneTab,
  selectRequestPaneTab,
  writeFieldValue
} from '../page/actions';
import { AUTH_MODE_LABELS } from '../constants';
import { buildCommonLocators } from '../page/locators';
import { buildQueryParamsLocators } from './params/query';

export const buildRequestLocators = (page: Page) => ({
  urlInput: () => page.getByTestId('request-url').locator('.CodeMirror'),
  urlLine: () => page.getByTestId('request-url').locator('.CodeMirror-line'),
  sendButton: () => page.getByTestId('send-arrow-icon'),
  methodDropdown: () => page.getByTestId('method-selector'),
  newRequestUrl: () => page.getByTestId('new-request-url').locator('.CodeMirror'),
  requestNameInput: () => page.getByPlaceholder('Request Name'),
  requestTestId: () => page.getByTestId('request-name'),
  generateCodeButton: () => page.getByTestId('generate-code-button'),
  bodyModeSelector: () => page.getByTestId('request-body-mode-selector'),
  bodyModeLabel: () => page.getByTestId('request-body-mode-label'),
  exampleBodyModeLabel: () => page.getByTestId('example-body-mode-label'),
  bodyEditor: () => page.getByTestId('request-body-editor'),
  // File / Binary body table + the rendered file name(s).
  fileBodyTable: () => page.getByTestId('file-body-table'),
  fileBodyName: () => page.getByTestId('file-body-table').locator('.file-name'),
  bodyVariableToken: (name: string, state?: 'valid' | 'invalid') => {
    const selector = state ? `.cm-variable-${state}` : '.cm-variable-valid, .cm-variable-invalid';
    return page.getByTestId('request-body-editor').locator('.CodeMirror').locator(selector).filter({ hasText: name }).first();
  },
  urlVariableToken: (name: string, state?: 'valid' | 'invalid') => {
    const selector = state ? `.cm-variable-${state}` : '.cm-variable-valid, .cm-variable-invalid';
    return page.getByTestId('request-url').locator('.CodeMirror').locator(selector).filter({ hasText: name }).first();
  },
  headerVariableToken: (row: Locator, name: string, state?: 'valid' | 'invalid') => {
    const selector = state ? `.cm-variable-${state}` : '.cm-variable-valid, .cm-variable-invalid';
    return row.locator('.CodeMirror').nth(1).locator(selector).filter({ hasText: name }).first();
  },
  pane: () => page.getByTestId('request-pane'),
  queryParams: {
    table: () => page.getByTestId('query-params-table'),
    row: (index: number) => page.getByTestId('query-params-table').locator('tbody tr').nth(index),
    value: (index: number) => page.getByTestId('query-params-table').locator('tbody tr').nth(index).getByTestId('column-value'),
    descriptionFirstLine: (index: number) =>
      page.getByTestId('query-params-table').locator('tbody tr').nth(index).getByTestId('column-description').locator('.CodeMirror-line').first()
  },
  headers: {
    table: () => page.getByTestId('request-headers-table'),
    inheritedSectionToggle: () => page.getByTestId('inherited-headers-section-toggle'),
    requestSectionToggle: () => page.getByTestId('request-headers-section-toggle'),
    inheritedSectionRow: () => page.getByTestId('inherited-headers-section-row'),
    requestSectionRow: () => page.getByTestId('request-headers-section-row'),
    defaultRow: (name: string) => page.getByTestId(`default-header-row-${name.toLowerCase()}`),
    defaultValueScroller: (name: string) => page.getByTestId(`default-header-row-${name.toLowerCase()}`).getByTestId('column-value').locator('.CodeMirror-scroll'),
    requestRow: (name: string) => page.getByTestId(`request-header-row-${name.toLowerCase()}`),
    inheritedRow: (name: string) => page.getByTestId(`inherited-header-row-${name.toLowerCase()}`),
    inheritedSource: (name: string) => page.getByTestId(`inherited-header-source-${name.toLowerCase()}`),
    addRow: () => page.getByTestId('request-header-add-row'),
    toggleInherited: () => page.getByTestId('toggle-inherited-headers'),
    paneScroller: () => page.getByTestId('request-pane').getByTestId('flex-boundary'),
    defaultInfo: (name: string) => page.getByTestId(`default-header-info-${name.toLowerCase()}`),
    defaultInfoTooltip: (name: string) => page.getByTestId(`default-header-info-tooltip-${name.toLowerCase()}`)
  },
  queryParams: buildQueryParamsLocators(page)
});

// Request-type radios in the New Request dialog. `from-curl` is the odd one out —
// the rest follow the `<type>-request` testid convention.
type NewRequestType = 'http-request' | 'graphql-request' | 'grpc-request' | 'ws-request' | 'from-curl';

/**
 * Replace the whole request URL in one edit, the way a paste does.
 * The URL editor rebuilds the query params on every change, so typing a full URL would
 * pass through intermediate URLs; this inserts the new URL as a single change.
 * @param page - The page object
 * @param url - The URL that replaces the current one
 */
export const replaceRequestUrl = async (page: Page, url: string) => {
  await test.step(`Replace request URL with: ${url}`, async () => {
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
    await buildRequestLocators(page).urlInput().click();
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.insertText(url);
  });
};

/**
 * Type text at the end of the request URL, one keystroke at a time.
 * @param page - The page object
 * @param text - The text to type after the current URL
 */
export const typeAtEndOfRequestUrl = async (page: Page, text: string) => {
  await test.step(`Type at the end of the request URL: ${text}`, async () => {
    await buildRequestLocators(page).urlInput().click();
    await page.keyboard.press('End');
    await page.keyboard.type(text);
  });
};

/**
 * Locators for the New Request dialog — the request-type radios and the
 * type-specific fields (e.g. the cURL command box for `from-curl`).
 */
export const buildNewRequestLocators = (page: Page) => ({
  requestTypeOption: (type: NewRequestType) => page.getByTestId(type),
  curlCommandInput: () => page.getByTestId('curl-command')
});

type CreateRequestFromCurlOptions = {
  inFolder?: boolean;
};

/**
 * Create a request by importing a cURL command via the New Request dialog.
 * @param page - The page object
 * @param requestName - The name to give the created request
 * @param curlCommand - The cURL command to import
 * @param parentName - The name of the collection or folder
 * @param options - Optional settings (inFolder)
 * @returns void
 */
export const createRequestFromCurl = async (
  page: Page,
  requestName: string,
  curlCommand: string,
  parentName: string,
  options: CreateRequestFromCurlOptions = {}
) => {
  const { inFolder = false } = options;
  const parentType = inFolder ? 'folder' : 'collection';

  await test.step(`Create request "${requestName}" from cURL in ${parentType} "${parentName}"`, async () => {
    const { sidebar, actions, dropdown, modal, request } = buildCommonLocators(page);
    const newRequest = buildNewRequestLocators(page);

    if (inFolder) {
      await sidebar.folder(parentName).hover();
      await actions.collectionItemActions(parentName).click();
    } else {
      const collectionRow = sidebar.collection(parentName);
      const collectionAction = actions.collectionActions(parentName);
      // Re-hover on each poll: CSS `:hover` reveals `.collection-actions`, but sidebar
      // re-renders can shift the row out from under a one-shot hover().
      await expect(async () => {
        await collectionRow.hover();
        await expect(collectionAction).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });
      await collectionAction.click();
    }

    await dropdown.item('New Request').click();

    await newRequest.requestTypeOption('from-curl').click();
    await request.requestNameInput().fill(requestName);
    await newRequest.curlCommandInput().fill(curlCommand);

    await modal.button('Create').click();

    if (inFolder) {
      await expect(sidebar.folderRequest(parentName, requestName)).toBeVisible();
    } else {
      await expect(sidebar.request(requestName)).toBeVisible();
    }
  });
};

export type { CreateRequestFromCurlOptions };

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

/**
 * Read the visible response preview editor text.
 */
export const readResponsePreviewBody = async (page: Page) => {
  const texts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
  return texts.join('\n');
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

/** Opens the request's Auth tab, picks API Key and sets its Value field. */
export const setApiKeyValue = async (page: Page, value: string) => {
  await test.step(`Set the API key value to "${value}"`, async () => {
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
    await writeFieldValue(page, 'Value', value);
  });
};
