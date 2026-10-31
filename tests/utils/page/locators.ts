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
import { buildCollectionsPlusMenuLocators } from '../../../playwright/pages/collection/manage';
import { buildImportCollectionLocators } from '../../../playwright/pages/collection/import';
import { buildExportCollectionLocators } from '../../../playwright/pages/collection/export';
import { buildCollectionPresetsLocators } from '../../../playwright/pages/collection/settings';
import { buildGenerateDocsLocators } from '../../../playwright/pages/collection/docs';
import { buildTagsLocators } from '../../../playwright/pages/shared-ui/tags';

export type { PresetRequestType } from '../../../playwright/pages/collection/settings';

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
  presets: buildCollectionPresetsLocators(page),
  tags: buildTagsLocators(page),
  generateDocs: buildGenerateDocsLocators(page),
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
  plusMenu: buildCollectionsPlusMenuLocators(page),
  import: buildImportCollectionLocators(page),
  export: buildExportCollectionLocators(page),
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
