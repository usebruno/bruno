import { test, expect, Page, Locator } from '../../playwright';
import { selectPaneTab } from '../shared-ui/pane-tabs';
import { buildQueryParamsLocators } from './params';
import { buildRequestSendLocators } from './send';
import { buildNewRequestModalLocators } from '../sidebar/item-actions';

/**
 * Locators for the request pane: URL bar, method, body, headers, params and variable tokens.
 */
export const buildRequestLocators = (page: Page) => ({
  urlInput: () => page.getByTestId('request-url').locator('.CodeMirror'),
  urlLine: () => page.getByTestId('request-url').locator('.CodeMirror-line'),
  sendButton: () => buildRequestSendLocators(page).sendButton(),
  methodDropdown: () => page.getByTestId('method-selector'),
  newRequestUrl: () => page.getByTestId('new-request-url').locator('.CodeMirror'),
  requestNameInput: () => buildNewRequestModalLocators(page).requestNameInput(),
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

const buildLocators = (page: Page) => ({
  request: buildRequestLocators(page)
});

/**
 * Fill the URL field in the currently active request
 * Works with HTTP, GraphQL, gRPC, and WebSocket requests
 * @param page - The page object
 * @param url - The URL to fill
 * @param options - `replace: true` overwrites the existing URL; by default the text is inserted at the cursor
 * @returns void
 */
export const fillRequestUrl = async (page: Page, url: string, { replace = false } = {}) => {
  await test.step(`Fill request URL: ${url}`, async () => {
    // HTTP/GraphQL requests use #request-url
    // gRPC/WebSocket don't have a specific ID, so we need to find the CodeMirror in the active request pane
    const httpGraphqlUrl = page.locator('#request-url .CodeMirror');
    const grpcWsUrl = page.locator('.input-container .CodeMirror').first();

    // Try HTTP/GraphQL selector first
    const isHttpOrGraphql = await httpGraphqlUrl.isVisible().catch(() => false);
    const selectAll = () => page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');

    if (isHttpOrGraphql) {
      await httpGraphqlUrl.click();
      if (replace) await selectAll();
      await page.locator('#request-url textarea').fill(url);
    } else {
      // Fall back to generic selector for gRPC/WebSocket
      await grpcWsUrl.click();
      if (replace) await selectAll();
      await page.locator('.input-container textarea').first().fill(url);
    }

    await page.waitForTimeout(200);
  });
};

export const selectRequestPaneTab = async (page: Page, tabName: string) => {
  await selectPaneTab(page, '[data-testid="request-pane"] > .px-4', tabName);
};

/**
 * Save the current request and verify success toast
 * @param page - The page object
 * @returns void
 */
export const saveRequest = async (page: Page) => {
  await test.step('Save request', async () => {
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully').last()).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(200);
  });
};

/**
 * Open the request pane's tab overflow dropdown if it is present. Tabs that
 * don't fit the pane width land there instead of the visible tab row.
 * @param page - The page object
 */
export const openRequestPaneTabOverflow = async (page: Page) => {
  const overflowButton = page.locator('[data-testid="request-pane"] .tabs .more-tabs');
  if (await overflowButton.isVisible()) {
    await overflowButton.click();
  }
};

/**
 * A tab entry inside the request pane's overflow dropdown.
 * @param page - The page object
 * @param label - The tab label to match (exact match via regex recommended)
 */
export const requestPaneOverflowTabItem = (page: Page, label: string | RegExp) =>
  page.locator('.tippy-box .dropdown-item').filter({ hasText: label });

/**
 * Set the active request's URL and save it. Typed char-by-char so CodeMirror
 * tokenizes `{{var}}` references (vs. a bulk fill that skips tokenization).
 * @param page - The page object
 * @param url - The URL to type into the request URL editor
 */
export const setRequestUrlAndSave = async (page: Page, url: string) => {
  await test.step(`Set request URL: ${url}`, async () => {
    const { request } = buildLocators(page);
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await request.urlInput().click();
    await page.keyboard.type(url);
    await page.keyboard.press(saveShortcut);
  });
};
