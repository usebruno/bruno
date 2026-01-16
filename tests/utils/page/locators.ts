import { Page } from '../../../playwright';

export const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
  saveButton: () => page
    .locator('.infotip')
    .filter({ hasText: /^Save/ }),
  sidebar: {
    collectionsContainer: () => page.getByTestId('collections'),
    collection: (name: string) => page.locator('#sidebar-collection-name').filter({ hasText: name }),
    folder: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    request: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    folderRequest: (folderName: string, requestName: string) => {
      // Find the folder's collection-item-name, then navigate to its parent wrapper container (StyledWrapper),
      // and search for the request within that container's descendants.
      // Using .locator('..') gets the parent element of the folder's collection-item-name div.
      const folderWrapper = page.locator('.collection-item-name').filter({ hasText: folderName }).locator('..');
      return folderWrapper.locator('.collection-item-name').filter({ hasText: requestName });
    },
    closeAllCollectionsButton: () => page.getByTestId('collections-header-actions-menu-close-all'),
    collectionRow: (name: string) => page.locator('.collection-name').filter({
      has: page.locator('#sidebar-collection-name', { hasText: name })
    })
  },
  actions: {
    collectionActions: (collectionName: string) =>
      page.getByTestId('collections').locator('.collection-name')
        .filter({ hasText: collectionName })
        .locator('.collection-actions .icon'),
    collectionItemActions: (itemName: string) =>
      page.locator('.collection-item-name')
        .filter({ hasText: itemName })
        .locator('.menu-icon')
  },
  dropdown: {
    item: (text: string) => page.locator('.dropdown-item').filter({ hasText: text }),
    tippyItem: (text: string) => page.locator('.tippy-box .dropdown-item').filter({ hasText: text })
  },
  tabs: {
    requestTab: (requestName: string) => page.locator('.request-tab .tab-label').filter({ hasText: requestName }),
    activeRequestTab: () => page.locator('.request-tab.active'),
    closeTab: (requestName: string) => page.locator('.request-tab').filter({ hasText: requestName }).getByTestId('request-tab-close-icon')
  },
  folder: {
    chevron: (folderName: string) => page.locator('.collection-item-name').filter({ hasText: folderName }).getByTestId('folder-chevron')
  },
  modal: {
    title: (title: string) => page.locator('.bruno-modal-header-title').filter({ hasText: title }),
    byTitle: (title: string) => page.locator('.bruno-modal').filter({ has: page.locator('.bruno-modal-header-title').filter({ hasText: title }) }),
    button: (name: string) => page.locator('.bruno-modal').getByRole('button', { name: name, exact: true }),
    closeButton: () => page.locator('.bruno-modal').getByTestId('modal-close-button'),
    card: () => page.locator('.bruno-modal-card'),
    footer: () => page.locator('.bruno-modal-footer'),
    submitButton: () => page.locator('.bruno-modal-footer .submit')
  },
  environment: {
    selector: () => page.getByTestId('environment-selector-trigger'),
    collectionTab: () => page.getByTestId('env-tab-collection'),
    globalTab: () => page.getByTestId('env-tab-global'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true }),
    currentEnvironment: () => page.locator('.current-environment'),
    addVariableButton: () => page.locator('button[data-testid="add-variable"]'),
    variableNameInput: (index: number) => page.locator(`input[name="${index}.name"]`),
    variableSecretCheckbox: (index: number) => page.locator(`input[name="${index}.secret"]`),
    variableRow: (index: number) => page.locator('tr').filter({ has: page.locator(`input[name="${index}.name"]`) }),
    createEnvButton: () => page.locator('button[id="create-env"]'),
    envNameInput: () => page.locator('input[name="name"]')
  },
  request: {
    urlInput: () => page.locator('#request-url .CodeMirror'),
    urlLine: () => page.locator('#request-url .CodeMirror-line'),
    sendButton: () => page.getByTestId('send-arrow-icon'),
    methodDropdown: () => page.getByTestId('request-method-selector'),
    newRequestUrl: () => page.locator('#new-request-url .CodeMirror'),
    requestNameInput: () => page.getByPlaceholder('Request Name'),
    requestTestId: () => page.getByTestId('request-name')
  },
  tags: {
    input: () => page.getByTestId('tag-input').getByRole('textbox'),
    item: (tagName: string) => page.locator('.tag-item', { hasText: tagName })
  },
  response: {
    statusCode: () => page.getByTestId('response-status-code'),
    pane: () => page.locator('.response-pane'),
    copyButton: () => page.locator('button[title="Copy response to clipboard"]'),
    body: () => page.locator('.response-pane'),
    editorContainer: () => page.locator('.response-pane .editor-container'),
    formatTab: () => page.getByTestId('format-response-tab'),
    formatTabDropdown: () => page.getByTestId('format-response-tab-dropdown'),
    previewContainer: () => page.getByTestId('response-preview-container'),
    codeLine: () => page.locator('.response-pane .editor-container .CodeMirror-line'),
    jsonTreeLine: () => page.locator('.response-pane .object-content')
  },
  plusMenu: {
    button: () => page.getByTestId('collections-header-add-menu'),
    createCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }),
    importCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' })
  },
  import: {
    modal: () => page.locator('[data-testid="import-collection-modal"]'),
    locationModal: () => page.locator('[data-testid="import-collection-location-modal"]'),
    locationInput: () => page.locator('#collection-location'),
    fileInput: () => page.locator('input[type="file"]'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true })
  },
  /**
   * Build generic table locators for any table with a testId
   * @param testId - The testId of the table
   * @returns Table locators object
   */
  table: (testId: string) => {
    const container = () => page.getByTestId(testId);
    const getBodyRow = (index?: number) => {
      const locator = container().locator('tbody tr');
      return index !== undefined ? locator.nth(index) : locator;
    };

    return {
      container,
      row: (index?: number) => getBodyRow(index),
      rowCell: (columnKey: string, rowIndex?: number) => {
        const row = getBodyRow(rowIndex);
        return row.getByTestId(`column-${columnKey}`);
      },
      rowCheckbox: (rowIndex: number) => getBodyRow(rowIndex).getByTestId('column-checkbox'),
      rowDeleteButton: (rowIndex: number) => getBodyRow(rowIndex).getByTestId('column-delete'),
      allRows: () => container().locator('tbody tr')
    };
  },
  /**
   * Assertions table locators (extends generic table with assertion-specific helpers)
   * @returns Assertions table locators object
   */
  assertionsTable: () => {
    const baseTable = buildCommonLocators(page).table('assertions-table');
    return {
      ...baseTable,
      // Assertion-specific helpers
      rowExprInput: (rowIndex: number) => {
        const cell = baseTable.rowCell('name', rowIndex);
        // Wait for the cell to be visible, then find the textbox
        return cell.getByRole('textbox').or(cell.locator('input[type="text"]'));
      },
      rowOperatorSelect: (rowIndex: number) => {
        const cell = baseTable.rowCell('operator', rowIndex);
        return cell.getByTestId('assertion-operator-select').or(cell.locator('select'));
      },
      rowValueInput: (rowIndex: number) => baseTable.rowCell('value', rowIndex)
    };
  }
});

export const buildWebsocketCommonLocators = (page: Page) => ({
  ...buildCommonLocators(page),
  connectionControls: {
    connect: () =>
      page
        .locator('div.connection-controls')
        .locator('.infotip')
        .filter({ hasText: /^Connect$/ }),
    disconnect: () =>
      page
        .locator('div.connection-controls')
        .locator('.infotip')
        .filter({ hasText: /^Close Connection$/ })
  },
  messages: () => page.locator('.ws-message'),
  toolbar: {
    latestFirst: () => page.getByRole('button', { name: 'Latest First' }),
    latestLast: () => page.getByRole('button', { name: 'Latest Last' }),
    clearResponse: () => page.getByTestId('response-clear-btn')
  }
});

export const getTableCell = (row, index) => row.locator('td').nth(index + 1);

export const buildGrpcCommonLocators = (page: Page) => ({
  ...buildCommonLocators(page),
  method: {
    dropdownTrigger: () => page.getByTestId('grpc-method-dropdown-trigger'),
    indicator: () => page.getByTestId('grpc-method-indicator')
  },
  request: {
    queryUrlContainer: () => page.getByTestId('grpc-query-url-container'),
    sendButton: () => page.getByTestId('grpc-send-request-button'),
    messagesContainer: () => page.getByTestId('grpc-messages-container'),
    addMessageButton: () => page.getByTestId('grpc-add-message-button'),
    sendMessage: (index: number) => page.getByTestId(`grpc-send-message-${index}`),
    endConnectionButton: () => page.getByTestId('grpc-end-connection-button'),
    cancelConnectionButton: () => page.getByTestId('grpc-cancel-connection-button')
  },
  response: {
    statusCode: () => page.getByTestId('grpc-response-status-code'),
    statusText: () => page.getByTestId('grpc-response-status-text'),
    content: () => page.getByTestId('grpc-response-content'),
    container: () => page.getByTestId('grpc-responses-container'),
    singleResponse: () => page.getByTestId('grpc-single-response'),
    list: () => page.getByTestId('grpc-responses-list'),
    responseItem: (index: number) => page.getByTestId(`grpc-response-item-${index}`),
    responseItems: () => page.locator('[data-testid^="grpc-response-item-"]'),
    tabCount: () => page.getByRole('tab', { name: 'Response' }).getByTestId('grpc-tab-response-count')
  }
});

/**
 * Builds locators for sandbox mode settings
 * @param page - The Playwright page object
 * @returns Object with locators for sandbox elements
 */
export const buildSandboxLocators = (page: Page) => ({
  sandboxModeSelector: () => page.getByTestId('sandbox-mode-selector'),
  safeModeRadio: () => page.getByTestId('sandbox-mode-safe'),
  developerModeRadio: () => page.getByTestId('sandbox-mode-developer'),
  jsSandboxHeading: () => page.getByText('JavaScript Sandbox'),
  saveButton: () => page.getByRole('button', { name: 'Save' })
});
