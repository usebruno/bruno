import { test, expect, Page, Locator } from '../../../playwright';
import { buildCommonLocators } from './locators';

export const buildRequestLocators = (page: Page) => ({
  urlInput: () => page.getByTestId('request-url').locator('.CodeMirror'),
  urlLine: () => page.getByTestId('request-url').locator('.CodeMirror-line'),
  sendButton: () => page.getByTestId('send-arrow-icon'),
  methodDropdown: () => page.getByTestId('request-method-selector'),
  newRequestUrl: () => page.locator('#new-request-url .CodeMirror'),
  requestNameInput: () => page.getByPlaceholder('Request Name'),
  requestTestId: () => page.getByTestId('request-name'),
  generateCodeButton: () => page.getByTestId('generate-code-button'),
  bodyModeSelector: () => page.getByTestId('request-body-mode-selector'),
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
  pane: () => page.getByTestId('request-pane')
});

// Request-type radios in the New Request dialog. `from-curl` is the odd one out —
// the rest follow the `<type>-request` testid convention.
type NewRequestType = 'http-request' | 'graphql-request' | 'grpc-request' | 'ws-request' | 'from-curl';

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
      }).toPass({ timeout: 10000 });
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
