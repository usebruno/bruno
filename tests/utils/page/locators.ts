import { Locator, Page } from '../../../playwright';
import { buildApiSpecPanelLocators } from './openapi/render-spec';
import { buildFileModeLocators } from './file-mode';
import { buildPreferencesLocators } from './preferences';
import { buildAiPreferencesLocators } from './ai';
import { buildSidebarLocators } from './sidebar';
import { buildDeleteCollectionItemModalLocators } from './collection/delete-collection-item';
import { buildWebsocketCommonLocators } from './websocket';

export const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
  fileMode: buildFileModeLocators(page),
  openApi: {
    render: buildApiSpecPanelLocators(page)
  },
  preferences: buildPreferencesLocators(page),
  ai: buildAiPreferencesLocators(page),
  websocket: buildWebsocketCommonLocators(page),
  saveButton: () => page.getByTestId('save-request-button'),
  settingsSaveButton: () => page.getByRole('button', { name: 'Save' }),
  openPreferences: () => page.getByRole('button', { name: 'Open Preferences' }),
  sidebar: buildSidebarLocators(page),
  deleteCollectionItemModal: buildDeleteCollectionItemModalLocators(page),
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
    folderTab: (folderName: string) => page.locator('.request-tab .tab-label').filter({ hasText: folderName }),
    collectionSettingsTab: () =>
      page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) }),
    activeRequestTab: () => page.locator('.request-tab.active'),
    closeTab: (requestName: string) => page.locator('.request-tab').filter({ hasText: requestName }).getByTestId('request-tab-close-icon'),
    draftIndicator: () => page.locator('.request-tab.active .has-changes-icon')
  },
  paneTabs: {
    responsiveTab: (key: string) => page.getByTestId(`responsive-tab-${key}`),
    collectionSettingsTab: (key: string) => page.getByTestId(`collection-settings-tab-${key}`),
    folderSettingsTab: (key: string) => page.getByTestId(`folder-settings-tab-${key}`),
    folderScriptTab: (key: 'pre-request' | 'post-response') => page.getByTestId(`tab-trigger-${key}`),
    tabTrigger: (key: string) => page.getByTestId(`tab-trigger-${key}`)
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
    submitButton: () => page.locator('.bruno-modal-footer .submit'),
    newRequestMethodOption: (id: string) => page.getByTestId(`method-selector-${id.toLowerCase()}`)
  },
  environment: {
    selector: () => page.getByTestId('environment-selector-trigger'),
    collectionTab: () => page.getByTestId('env-tab-collection'),
    globalTab: () => page.getByTestId('env-tab-global'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true }),
    listOption: (name: string) => page.locator('.environment-list .dropdown-item', { hasText: name }),
    currentEnvironment: () => page.locator('.current-environment'),
    configureButton: () => page.locator('#configure-env'),
    saveButton: () => page.getByTestId('save-env'),
    varRow: (name: string) => page.getByTestId(`env-var-row-${name}`),
    // Prefix match — keep as a CSS selector since getByTestId is exact-match only.
    varRows: () => page.locator('tbody tr[data-testid^="env-var-row-"]'),
    // Rows for `name` whose CodeMirror value matches `value`. Useful when two rows
    // share a name (e.g. enabled + disabled twins after a script write).
    varRowsByValue: (name: string, value: string | RegExp) =>
      page.getByTestId(`env-var-row-${name}`)
        .filter({ has: page.getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror-line', { hasText: value }) }),
    // Each env-var row has an `enabled` and a `secret` checkbox; target the latter
    // by its `<index>.secret` name (the formik index is dynamic).
    varRowSecretCheckbox: (name: string) => page.getByTestId(`env-var-row-${name}`).locator('input[name$=".secret"]'),
    // Eye icon that masks/reveals a secret variable's value.
    varRowEyeToggle: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId('secret-reveal-toggle'),
    varRowValueCell: (name: string) => page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/),
    varRowValueEditor: (name: string) =>
      page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first(),
    varRowValueLine: (name: string) =>
      page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror-line').first(),
    varRowLine: (name: string) =>
      page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror-line').first(),
    addVariableButton: () => page.getByTestId('add-variable'),
    variableNameInput: (index: number) => page.locator(`input[name="${index}.name"]`),
    variableSecretCheckbox: (index: number) => page.locator(`input[name="${index}.secret"]`),
    variableRow: (index: number) => page.locator('tr').filter({ has: page.locator(`input[name="${index}.name"]`) }),
    variableDescriptionEditor: (index: number) =>
      page.locator(`[data-testid="test-multiline-editor-${index}.description"]`).locator('.CodeMirror'),
    varRowDescriptionEditor: (name: string) =>
      page.getByTestId(`env-var-row-${name}`).getByTestId(/^test-multiline-editor-\d+\.description$/).locator('.CodeMirror').first(),
    variableRowByName: (name: string) => page.locator('tbody tr').filter({ has: page.locator(`input[value="${name}"]`) }),
    // Targets the `.CodeMirror` wrapper (not `.CodeMirror-line`) so single-line and
    // multi-line values (e.g. formatted JSON for @object vars) are both covered —
    // CodeMirror renders each visual line as a separate `.CodeMirror-line`, so
    // matching on the wrapper is the only way to get the full concatenated text.
    variableValue: (name: string) =>
      page.locator('tbody tr').filter({ has: page.locator(`input[value="${name}"]`) }).getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first(),
    createEnvButton: () => page.locator('button[id="create-env"]'),
    settingsCreateButton: () =>
      page.locator('.environments-container .sidebar button[title="Create environment"]'),
    settingsCreateNameInput: () => page.locator('.environment-item.creating .environment-name-input'),
    settingsCreateSaveButton: () => page.locator('.environment-item.creating .inline-action-btn.save'),
    createModal: () => page.locator('.bruno-modal').filter({ hasText: /Create( Global)? Environment/ }),
    createModalNameInput: () => page.locator('.bruno-modal #environment-name'),
    createModalCreateButton: () => page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }),
    envNameInput: () => page.locator('input[name="name"]'),
    // Variables and secrets each live on their own tab in the environment editor.
    variablesTab: () => page.getByTestId('responsive-tab-variables'),
    secretsTab: () => page.getByTestId('responsive-tab-secrets'),
    // The per-tab unsaved-changes dot, scoped to its tab (the visible tab carries the
    // responsive-tab testid; the hidden measurement copy does not, so this stays unique).
    // The dot is always in the DOM and toggles via visibility, so assert with
    // toBeVisible()/toBeHidden() rather than presence.
    tabDot: (tab: string) => page.getByTestId(`responsive-tab-${tab}`).getByTestId('env-tab-draft-indicator'),
    saveTab: () => page.getByTestId('save-env'),
    saveAll: () => page.getByTestId('save-all-env'),
    searchInput: () => page.getByTestId('env-search-input'),
    searchAction: () => page.getByTestId('env-search-action'),
    collectionEnvTab: () => page.locator('.request-tab').filter({ hasText: /^Environments$/ }),
    globalEnvTab: () => page.locator('.request-tab').filter({ hasText: /^Global Environments$/ }),
    unsavedModal: {
      closeWithoutSave: () => page.getByTestId('env-unsaved-close-without-save'),
      cancel: () => page.getByTestId('env-unsaved-cancel'),
      saveAndClose: () => page.getByTestId('env-unsaved-save-and-close')
    }
  },
  codeMirror: {
    byTestId: (testId: string) => page.getByTestId(testId).locator('.CodeMirror').first()
  },
  // The DataTypeSelector exposes a stable trigger per row (request/folder/collection
  // vars + env vars). Compact mode shows an icon; full mode shows `.type-label`.
  dataTypeSelector: {
    trigger: (row: Locator) => row.getByTestId('datatype-selector-trigger'),
    typeLabel: (row: Locator) => row.getByTestId('datatype-selector-trigger'),
    // Yellow warning icon shown when a value can't be coerced to its dataType.
    mismatchIcon: (row: Locator) => row.locator('svg.text-yellow-600'),
    menuItem: (type: string) => page.locator('[role="menu"]').last().getByText(type, { exact: true })
  },
  request: {
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
  },
  // The variable-info popup shown when hovering a `{{var}}` token in an editor.
  varInfoPopup: {
    all: () => page.getByTestId('var-info-popup'),
    byName: (name: string) =>
      page.getByTestId('var-info-popup').filter({ has: page.getByTestId('var-info-name').filter({ hasText: new RegExp(`^${name}$`) }) }),
    name: (popup: Locator) => popup.getByTestId('var-info-name'),
    scopeBadge: (popup: Locator) => popup.getByTestId('var-info-scope-badge'),
    valueDisplay: (popup: Locator) => popup.getByTestId(/^var-info-value-(editable|display)$/).first(),
    editableValue: (popup: Locator) => popup.getByTestId('var-info-value-editable').first(),
    secretToggle: (popup: Locator) => popup.getByTestId('var-info-secret-toggle'),
    copyButton: (popup: Locator) => popup.getByTestId('var-info-copy-button'),
    readonlyNote: (popup: Locator) => popup.getByTestId('var-info-readonly-note'),
    warningNote: (popup: Locator) => popup.getByTestId('var-info-warning-note'),
    // The editor container itself (hidden until the value display is clicked).
    editorContainer: (popup: Locator) => popup.getByTestId('var-info-value-editor'),
    editor: (popup: Locator) => popup.getByTestId('var-info-value-editor').locator('.CodeMirror')
  },
  auth: {
    apiKey: {
      placementSelector: () => page.getByTestId('auth-placement-selector'),
      placementLabel: () => page.getByTestId('auth-placement-label')
    },
    oauth2: {
      grantTypeDropdown: () => page.getByTestId('grant-type-dropdown'),
      tokenHeaderPrefixField: () => page.getByTestId('token-header-prefix'),
      tokenQueryParamKeyField: () => page.getByTestId('token-query-param-key')
    },
    modeSelector: () => page.getByTestId('auth-mode-selector'),
    modeLabel: () => page.getByTestId('auth-mode-label'),
    inheritedMode: () => page.getByTestId('inherited-auth-mode'),
    dropdownItem: (id: string) => page.getByTestId(`auth-mode-dropdown-${id}`)
  },
  presets: {
    requestType: (type: 'http' | 'graphql' | 'grpc' | 'ws') =>
      page.getByTestId(`presets-request-type-${type}`),
    requestUrl: () => page.getByTestId('presets-request-url'),
    saveBtn: () => page.getByTestId('presets-save-btn')
  },
  tags: {
    input: () => page.getByTestId('tag-input').getByRole('textbox'),
    item: (tagName: string) => page.locator('.tag-item', { hasText: tagName })
  },
  generateDocs: {
    menuItem: () => page.locator('.dropdown-item').filter({ hasText: 'Generate Docs' }),
    modal: () => page.locator('.bruno-modal').filter({
      has: page.locator('.bruno-modal-header-title').filter({ hasText: 'Generate Documentation' })
    }),
    heading: () => page.locator('.bruno-modal').getByText('Interactive API Documentation'),
    generateButton: () => page.locator('.bruno-modal').getByRole('button', { name: 'Generate', exact: true }),
    cancelButton: () => page.locator('.bruno-modal').getByRole('button', { name: 'Cancel', exact: true }),
    // Collection name + version (read-only) display
    versionInfo: () => page.locator('.bruno-modal').getByTestId('version-info'),
    collectionName: () => page.locator('.bruno-modal').getByTestId('collection-name'),
    versionValue: () => page.locator('.bruno-modal').getByTestId('version-value'),
    versionCounts: () => page.locator('.bruno-modal').getByTestId('version-summary'),
    // Environment selection list
    environmentsTitle: () => page.locator('.bruno-modal').getByTestId('env-section-title'),
    // Header controls: tri-state "select all" checkbox + "X/Y selected" count
    selectAllCheckbox: () => page.locator('.bruno-modal').getByTestId('env-select-all'),
    selectAllLabel: () => page.locator('.bruno-modal').getByTestId('env-select-all-label'),
    selectedCount: () => page.locator('.bruno-modal').getByTestId('env-selected-count'),
    environmentRows: () => page.locator('.bruno-modal').getByTestId('env-row'),
    environmentRow: (name: string) =>
      page.locator('.bruno-modal').getByTestId('env-row').filter({ has: page.getByText(name, { exact: true }) }),
    // A row has exactly one checkbox; its data-testid is uid-keyed, so select it by role within the named row.
    environmentCheckbox: (name: string) =>
      page
        .locator('.bruno-modal')
        .getByTestId('env-row')
        .filter({ has: page.getByText(name, { exact: true }) })
        .getByRole('checkbox')
  },
  runnerResults: {
    itemPath: (name: string) => page.getByTestId('runner-result-item').filter({ hasText: name })
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
    previewContainerCodeMirror: () => page.getByTestId('response-preview-container').locator('.CodeMirror').first(),
    codeLine: () => page.locator('.response-pane .editor-container .CodeMirror-line'),
    jsonTreeLine: () => page.locator('.response-pane .object-content'),
    // Tests-tab summary line ("Tests (N), Passed: X, Failed: Y") and failure rows.
    testSummary: () => page.locator('.test-summary').filter({ hasText: 'Tests' }),
    testFailures: () => page.locator('.test-result-item .test-failure')
  },
  timeline: {
    items: () => page.getByTestId('timeline-item'),
    lastItem: () => page.getByTestId('timeline-item').last(),
    itemHeader: (item: Locator) => item.getByTestId('timeline-item-header'),
    networkButton: (item: Locator) => item.getByRole('button', { name: 'Network' }),
    networkLogs: (item: Locator) => item.locator('.network-logs-container'),
    clearButton: () => page.getByRole('button', { name: 'Clear Timeline' })
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
    bulkModal: () => page.getByTestId('bulk-import-collection-location-modal'),
    bulkFormatSelect: () => page.getByTestId('bulk-import-collection-location-modal').getByTestId('bulk-import-collection-format-selector'),
    bulkLocationInput: () => page.getByTestId('bulk-import-collection-location-modal').getByTestId('bulk-import-collection-location-input'),
    bulkSubmitButton: () => page.getByTestId('bulk-import-collection-location-modal-submit-btn'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true }),
    parsingError: () => page.getByTestId('import-error-message'),
    browseLink: (root?: Locator) => (root ?? page).getByTestId('import-collection-browse-link'),
    importButton: (root?: Locator) => (root ?? page).getByTestId('import-collection-location-modal-submit-btn'),
    ...(() => {
      const issuesToast = () => page.getByTestId('import-issues-toast').last();
      return {
        issuesToast,
        issuesToastTitle: () => issuesToast().getByTestId('import-issues-toast-title'),
        issuesToastCopyBtn: () => issuesToast().getByTestId('import-issues-copy-btn'),
        issuesToastReportBtn: () => issuesToast().getByTestId('import-issues-report-btn'),
        issuesToastIncludeItemsCheckbox: () => issuesToast().getByTestId('import-issues-include-items-checkbox'),
        issuesToastCloseBtn: () => issuesToast().getByTestId('import-issues-toast-close'),
        issuesToastUrlTooLongWarning: () => issuesToast().getByTestId('import-issues-url-too-long-warning')
      };
    })()
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
      // EditableTable rows carry data-row-name derived from the key column.
      rowByName: (name: string) => container().locator(`tbody tr[data-row-name="${name}"]`),
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

export const getTableCell = (row, index) => row.locator('td').nth(index + 1);

export const buildGrpcCommonLocators = (page: Page) => ({
  ...buildCommonLocators(page),
  method: {
    dropdownTrigger: () => page.getByTestId('grpc-method-dropdown-trigger'),
    indicator: () => page.getByTestId('grpc-method-indicator'),
    dropdown: () => page.getByTestId('grpc-methods-dropdown'),
    item: (methodName: string) =>
      page.getByTestId('grpc-methods-dropdown').getByTestId('grpc-method-item').filter({ hasText: methodName }),
    selectedName: () => page.getByTestId('selected-grpc-method-name')
  },
  request: {
    queryUrlContainer: () => page.getByTestId('grpc-query-url-container'),
    sendButton: () => page.getByTestId('grpc-send-request-button'),
    messagesContainer: () => page.getByTestId('grpc-messages-container'),
    addMessageButton: () => page.getByTestId('grpc-add-message-button'),
    regenerateMessage: (index: number) => page.getByTestId(`grpc-regenerate-message-${index}`),
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
 * Builds locators for script error display elements
 * @param page - The Playwright page object
 * @returns Object with locators for script error elements
 */
export const buildScriptErrorLocators = (page: Page) => ({
  /** All error cards on the page */
  cards: () => page.getByTestId('script-error-card'),
  /** Nth error card (0-indexed) */
  card: (index?: number) => {
    const cards = page.getByTestId('script-error-card');
    return index !== undefined ? cards.nth(index) : cards.first();
  },
  /** Error title within a card */
  title: (card?: Locator) => (card ?? page).getByTestId('script-error-title'),
  /** Close button within a card */
  closeButton: (card?: Locator) => (card ?? page).getByTestId('script-error-close'),
  /** Source label within a card */
  sourceLabel: (card?: Locator) => (card ?? page).getByTestId('script-error-source-label'),
  /** File path link within a card */
  filePath: (card?: Locator) => (card ?? page).getByTestId('script-error-file-path'),
  /** Error message within a card */
  message: (card?: Locator) => (card ?? page).getByTestId('script-error-message'),
  /** Code snippet within a card */
  codeSnippet: (card?: Locator) => (card ?? page).getByTestId('code-snippet'),
  /** Error-highlighted code line within a card */
  errorLine: (card?: Locator) => (card ?? page).getByTestId('code-line-error'),
  /** Stack trace toggle within a card */
  stackToggle: (card?: Locator) => (card ?? page).getByTestId('script-error-stack-toggle'),
  /** Stack trace content within a card */
  stack: (card?: Locator) => (card ?? page).getByTestId('script-error-stack'),
  /** ScriptErrorIcon (the red alert button shown when card is dismissed) */
  errorIcon: () => page.getByTestId('script-error-icon')
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
