import { Locator, Page } from '../../../playwright';
import { buildApiSpecPanelLocators } from './openapi/render-spec';
import { buildFileModeLocators } from './file-mode';
import { buildPreferencesLocators } from './preferences';
import { buildAiPreferencesLocators } from './ai';
import { buildCodeEditorSearchLocators } from './code-editor-search';
import { buildCodeEditorHintLocators } from './code-editor-hints';
import { buildRequestSettingsLocators } from './request-settings';
import { buildUnresolvedVariablesInfoLocators } from './unresolved-variables-info';
import { buildSidebarLocators } from './sidebar';
import { buildDocsLocators } from './docs';
import { buildMigrateToYmlLocators } from './collection/migrate-to-yml';
import { buildWebsocketCommonLocators } from './websocket';
import { buildToastLocators } from '../../../playwright/pages/app-shell/toast';
import { buildSecretVariableFormLocators } from './secret-variable-form';
import { buildRequestLocators } from '../../../playwright/pages/request/pane';
import { buildCollectionHeaderLocators } from './collection/collection-header';
import { buildCollectionProxyLocators } from './collection/proxy';
import { buildCodeMirrorLocators } from './code-mirror';
import { buildEnvironmentLocators } from './environments';
import { buildTimelineHeaderLocators } from './timeline-headers';
import { buildSetAsVariableLocators } from './set-as-variable';
import { buildDevToolsLocators } from './devtools-console';
import { buildVariablesTabLocators } from './variables-tab';
import { buildWorkspaceOverviewLocators } from './workspace/workspace-overview';
import { buildManageWorkspaceLocators } from './workspace/manage-workspace';
import { buildCreateWorkspaceModalLocators } from './workspace/create-workspace-modal';
import { buildTitleBarLocators } from './title-bar';
import { buildCloneGitRepositoryLocators } from './git/clone-git-repository';
import { buildResponseExampleLocators } from '../../../playwright/pages/response-example';
import { buildGraphqlQueryBuilderLocators } from './graphql/query-builder';
import { buildAuthLocators } from './auth';
import { buildModalLocators } from '../../../playwright/pages/shared-ui/modal';
import { buildDropdownLocators } from '../../../playwright/pages/shared-ui/dropdown';
import { buildFolderLocators } from '../../../playwright/pages/sidebar/collection-tree';
import { buildItemActionLocators } from '../../../playwright/pages/sidebar/item-actions';
import { buildResponseLocators } from '../../../playwright/pages/response';
import { buildRequestTabsLocators } from '../../../playwright/pages/request-tabs';
import { buildPaneTabsLocators } from '../../../playwright/pages/shared-ui/pane-tabs';
import { buildTableLocator } from '../../../playwright/pages/shared-ui/table';
import { buildAssertionsTableLocator } from '../../../playwright/pages/request/assertions';
import { buildGrpcLocators } from '../../../playwright/pages/request/grpc';
import { buildOpenCollectionPickerLocators } from '../../../playwright/pages/collection/open-collection-picker';
import { buildDataTypeSelectorLocators } from '../../../playwright/pages/shared-ui/data-type-selector';

export type PresetRequestType = 'http' | 'graphql' | 'grpc' | 'ws';

const addToNoEnvNoteLocator = (popup: Locator, scopeType: 'environment' | 'global') =>
  popup.getByTestId('var-info-add-to-no-env-note')
    .filter({ hasText: scopeType === 'global' ? 'Global Environment' : 'Collection Environment' });

export const buildCommonLocators = (page: Page) => ({
  titleBar: buildTitleBarLocators(page),
  collectionHeader: buildCollectionHeaderLocators(page),
  collectionProxy: buildCollectionProxyLocators(page),
  runner: () => page.getByTestId('run-button'),
  fileMode: buildFileModeLocators(page),
  timelineHeaders: buildTimelineHeaderLocators(page),
  devtools: buildDevToolsLocators(page),
  codeEditorSearch: (editorId: string) => buildCodeEditorSearchLocators(page, editorId),
  codeEditorHints: buildCodeEditorHintLocators(page),
  openApi: {
    render: buildApiSpecPanelLocators(page)
  },
  preferences: buildPreferencesLocators(page),
  ai: buildAiPreferencesLocators(page),
  requestSettings: buildRequestSettingsLocators(page),
  unresolvedVariablesInfo: buildUnresolvedVariablesInfoLocators(page),
  websocket: buildWebsocketCommonLocators(page),
  toast: buildToastLocators(page),
  secretVariableForm: buildSecretVariableFormLocators(page),
  request: buildRequestLocators(page),
  setAsVariable: buildSetAsVariableLocators(page),
  responseExample: buildResponseExampleLocators(page),
  graphqlQueryBuilder: buildGraphqlQueryBuilderLocators(page),
  saveButton: () => page.getByTestId('save-request-button'),
  settingsSaveButton: () => page.getByRole('button', { name: 'Save' }),
  openPreferences: () => page.getByRole('button', { name: 'Open Preferences' }),
  sidebar: buildSidebarLocators(page),
  workspaceOverview: buildWorkspaceOverviewLocators(page),
  manageWorkspace: buildManageWorkspaceLocators(page),
  createWorkspaceModal: buildCreateWorkspaceModalLocators(page),
  cloneGitRepository: buildCloneGitRepositoryLocators(page),
  migrateToYml: buildMigrateToYmlLocators(page),
  environment: buildEnvironmentLocators(page),
  variablesTab: buildVariablesTabLocators(page),
  actions: buildItemActionLocators(page),
  dropdown: buildDropdownLocators(page),
  tabs: buildRequestTabsLocators(page),
  paneTabs: buildPaneTabsLocators(page),
  docs: buildDocsLocators(page),
  aiAssist: {
    trigger: (scriptType: string) => page.getByTestId(`ai-assist-trigger-${scriptType}`),
    requestPaneTabBarTrigger: (scriptType: string) =>
      page.locator('[data-testid="request-pane"] [role="tablist"]').getByTestId(`ai-assist-trigger-${scriptType}`),
    settingsTabBarTrigger: (scriptType: string) =>
      page.getByTestId('settings-tab-bar').getByTestId(`ai-assist-trigger-${scriptType}`)
  },
  folder: buildFolderLocators(page),
  modal: buildModalLocators(page),
  openCollectionPicker: buildOpenCollectionPickerLocators(page),
  codeMirror: buildCodeMirrorLocators(page),
  dataTypeSelector: buildDataTypeSelectorLocators(page),
  filePicker: {
    warningTooltip: () => page.getByTestId('file-picker-warning-tooltip')
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
    editor: (popup: Locator) => popup.getByTestId('var-info-value-editor').locator('.CodeMirror'),
    // The "Add to" switcher, shown in place of an editable value for undefined variables.
    addToSwitcher: (popup: Locator) => popup.getByTestId('var-info-add-to'),
    addToToggle: (popup: Locator) => popup.getByTestId('var-info-add-to-toggle'),
    addToList: (popup: Locator) => popup.getByTestId('var-info-add-to-list'),
    addToOption: (popup: Locator, scopeType: string) => popup.getByTestId(`var-info-add-to-option-${scopeType}`),
    addToActiveOption: (popup: Locator, scopeType?: string) => {
      const activeRow = popup.locator('.var-add-to-option-active');
      return scopeType ? activeRow.getByTestId(`var-info-add-to-option-${scopeType}`) : activeRow;
    },
    addToSecretCheckbox: (popup: Locator) => popup.getByTestId('var-info-add-to-secret-checkbox'),
    addToNoEnvNote: (popup: Locator, scopeType: 'environment' | 'global') => addToNoEnvNoteLocator(popup, scopeType),
    addToCreateEnvButton: (popup: Locator, scopeType: 'environment' | 'global') =>
      addToNoEnvNoteLocator(popup, scopeType)
        .locator('xpath=..')
        .getByTestId('var-info-add-to-create-env-button'),
    addToCreateEnvNameInput: (popup: Locator) => popup.getByTestId('var-info-add-to-create-env-name-input'),
    addToCreateEnvSubmit: (popup: Locator) => popup.getByTestId('var-info-add-to-create-env-submit'),
    addToError: (popup: Locator) => popup.getByTestId('var-info-add-to-error')
  },
  auth: buildAuthLocators(page),
  presets: {
    requestType: (type: PresetRequestType) =>
      page.getByTestId(`presets-request-type-${type}`),
    requestUrl: () => page.getByTestId('presets-request-url'),
    saveBtn: () => page.getByTestId('presets-save-btn'),
    defaultEnvironment: () => page.getByTestId('presets-default-environment'),
    defaultEnvironmentOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true })
  },
  tags: {
    input: () => page.getByTestId('tag-input').getByRole('textbox'),
    item: (tagName: string) => page.locator('.tag-item', { hasText: tagName }),
    ownItem: (tagName: string) => page.locator('.tag-item:not(.inherited)', { hasText: tagName }),
    ownItems: () => page.locator('.tag-item:not(.inherited)'),
    error: () => page.getByTestId('tag-error'),
    inheritedToggle: () => page.getByTestId('inherited-tags-toggle'),
    inheritedList: () => page.getByTestId('inherited-tag-list'),
    inheritedItems: () => page.getByTestId('inherited-tag'),
    inheritedItem: (tagName: string) => page.getByTestId('inherited-tag').filter({ hasText: tagName })
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
        .getByRole('checkbox'),
    advancedToggle: () => page.locator('.bruno-modal').getByTestId('docs-advanced-toggle'),
    allRequestsRadio: () => page.locator('.bruno-modal').getByTestId('docs-requests-all'),
    filterByTagsRadio: () => page.locator('.bruno-modal').getByTestId('docs-requests-filter'),
    tooltip: (text: string) => page.locator('.react-tooltip').filter({ hasText: text }),
    includeTagsInput: () => page.locator('.bruno-modal').getByLabel('Include Tags'),
    excludeTagsInput: () => page.locator('.bruno-modal').getByLabel('Exclude Tags'),
    tagChip: (name: string) => page.locator('.bruno-modal').getByTestId('tag-picker-item').filter({ hasText: name }),
    gitLinkLabel: () => page.locator('.bruno-modal').getByTestId('docs-git-link')
  },
  runnerResults: {
    itemPath: (name: string) => page.getByTestId('runner-result-item').filter({ hasText: name })
  },
  response: buildResponseLocators(page),
  timeline: {
    items: () => page.getByTestId('timeline-item'),
    lastItem: () => page.getByTestId('timeline-item').last(),
    itemHeader: (item: Locator) => item.getByTestId('timeline-item-header'),
    clearButton: () => page.getByRole('button', { name: 'Clear Timeline' }),
    container: () => page.getByTestId('timeline-container'),
    entries: () => page.getByTestId('timeline-container').getByTestId('timeline-entry'),
    networkButton: (item: Locator) => item.getByRole('button', { name: 'Network' }),
    networkLogs: (item: Locator) => item.locator('.network-logs-container'),
    headerRow: (item: Locator, name: string) => buildTimelineHeaderRow(page, item, name),
    headerValue: (item: Locator, name: string) =>
      buildTimelineHeaderRow(page, item, name).getByTestId('tl-header-value-request')
  },
  plusMenu: {
    button: () => page.getByTestId('collections-header-add-menu'),
    openCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Open collection' }),
    createCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }),
    importCollection: () => page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' })
  },
  import: {
    modal: () => page.locator('[data-testid="import-collection-modal"]'),
    locationModal: () => page.locator('[data-testid="import-collection-location-modal"]'),
    locationInput: () => page.locator('#collection-location'),
    fileInput: () => page.locator('input[type="file"]'),
    advancedOptionsToggle: () => page.getByTestId('show-advanced-options-toggle'),
    preserveScriptsToggle: () => page.getByTestId('preserve-scripts-toggle'),
    bulkModal: () => page.getByTestId('bulk-import-collection-location-modal'),
    bulkFormatSelect: () => page.getByTestId('bulk-import-collection-location-modal').getByTestId('bulk-import-collection-format-selector'),
    bulkLocationInput: () => page.getByTestId('bulk-import-collection-location-modal').getByTestId('bulk-import-collection-location-input'),
    bulkSubmitButton: () => page.getByTestId('bulk-import-collection-location-modal-submit-btn'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true }),
    parsingError: () => page.getByTestId('import-error-message'),
    browseLink: (root?: Locator) => (root ?? page).getByTestId('import-collection-browse-link'),
    importButton: (root?: Locator) => (root ?? page).getByTestId('import-collection-location-modal-submit-btn'),
    formatSelect: (root?: Locator) => (root ?? page).locator('#format'),
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
  export: {
    postmanModal: () => page.getByTestId('export-to-postman-modal'),
    exportTab: () => page.getByTestId('share-collection-tab-export'),
    postmanFormatCard: () => page.getByTestId('export-format-postman'),
    yamlFormatCard: () => page.getByTestId('export-format-yaml'),
    nameInput: () => page.getByLabel('Name', { exact: true }),
    locationInput: () => page.getByLabel('Location', { exact: true }),
    optionsButton: () => page.getByRole('button', { name: 'Options' }),
    advancedOptionsToggle: () => page.getByTestId('show-advanced-options-toggle'),
    preserveScriptsToggle: () => page.getByTestId('preserve-scripts-toggle')
  },
  /**
   * Build generic table locators for any table with a testId
   * @param testId - The testId of the table
   * @returns Table locators object
   */
  table: buildTableLocator(page),
  /**
   * Assertions table locators (extends generic table with assertion-specific helpers)
   * @returns Assertions table locators object
   */
  /**
   * @param scope - Which panel to target
   * @returns Panel locators object
   */
  varsPanel: (scope: 'folder' | 'collection') => {
    const container = () => page.getByTestId(`${scope}-vars-panel`);
    return {
      container,
      saveButton: () => container().getByRole('button', { name: 'Save', exact: true })
    };
  },
  assertionsTable: buildAssertionsTableLocator(page)
});

const buildTimelineHeaderRow = (page: Page, item: Locator, name: string) =>
  item.getByTestId('tl-header-row-request').filter({
    has: page.getByTestId('tl-header-name-request').and(page.getByText(name, { exact: true }))
  });

export const getTableCell = (row: any, index: number) => row.locator('td').nth(index + 1);

export const buildGrpcCommonLocators = (page: Page) => ({
  ...buildCommonLocators(page),
  ...buildGrpcLocators(page)
});

export { buildResponseErrorsLocators } from '../../../playwright/pages/response';

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
