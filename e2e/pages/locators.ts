/**
 * buildCommonLocators: every page object's locator builder in one object, for specs.
 * Page objects never import this file.
 */
import { Page } from '../playwright';
import { buildApiSpecPanelLocators } from './api-spec';
import { buildFileModeLocators } from './shared-ui/file-mode';
import { buildPreferencesLocators } from './app-shell/preferences';
import { buildAiPreferencesLocators } from './app-shell/ai-preferences';
import { buildCodeEditorSearchLocators } from './shared-ui/code-editor-search';
import { buildCodeEditorHintLocators } from './shared-ui/code-editor-hints';
import { buildRequestSettingsLocators } from './request/settings';
import { buildUnresolvedVariablesInfoLocators } from './variable/unresolved-info';
import { buildSidebarLocators, buildFolderLocators } from './sidebar/collection-tree';
import { buildDocsLocators, buildGenerateDocsLocators } from './collection/docs';
import { buildMigrateToYmlLocators } from './collection/migrate-to-yml';
import { buildWebsocketCommonLocators } from './request/websocket';
import { buildToastLocators } from './app-shell/toast';
import { buildSecretVariableFormLocators } from './variable/secret-form';
import { buildRequestLocators } from './request/pane';
import { buildCollectionHeaderLocators } from './collection/header';
import { buildCollectionAppLocators } from './collection/collection-app';
import { buildCollectionProxyLocators } from './collection/proxy';
import { buildCodeMirrorLocators } from './shared-ui/code-editor';
import { buildEnvironmentLocators } from './environment/environment';
import { buildTimelineHeaderLocators, buildTimelineLocators } from './response/timeline';
import { buildSetAsVariableLocators } from './variable/set-as-variable';
import { buildDevToolsLocators } from './app-shell/devtools';
import { buildVariablesTabLocators } from './variable/variables-tab';
import { buildWorkspaceOverviewLocators } from './workspace/workspace-overview';
import { buildManageWorkspaceLocators } from './workspace/manage-workspace';
import { buildCreateWorkspaceModalLocators } from './workspace/create-workspace-modal';
import { buildTitleBarLocators } from './app-shell/title-bar';
import { buildCloneGitRepositoryLocators } from './collection/git-clone';
import { buildResponseExampleLocators } from './response/example';
import { buildGraphqlQueryBuilderLocators } from './request/graphql-query-builder';
import { buildAuthLocators } from './request/auth';
import { buildModalLocators } from './shared-ui/modal';
import { buildDropdownLocators } from './shared-ui/dropdown';
import { buildItemActionLocators } from './sidebar/item-actions';
import { buildResponseLocators } from './response/pane';
import { buildRequestTabsLocators } from './app-shell/tabs';
import { buildPaneTabsLocators } from './shared-ui/pane-tabs';
import { buildTableLocator } from './shared-ui/table';
import { buildAssertionsTableLocator } from './request/assertions';
import { buildGrpcLocators } from './request/grpc';
import { buildOpenCollectionPickerLocators } from './collection/open-collection-picker';
import { buildDataTypeSelectorLocators } from './shared-ui/data-type-selector';
import { buildCollectionsPlusMenuLocators } from './collection/manage';
import { buildImportCollectionLocators } from './collection/import';
import { buildExportCollectionLocators } from './collection/export';
import { buildCollectionPresetsLocators } from './collection/settings';
import { buildTagsLocators } from './shared-ui/tags';
import { buildVarInfoPopupLocators } from './variable/tooltip';
import { buildAiAssistLocators } from './request/script';
import { buildFilePickerLocators } from './request/body';
import { buildRunnerResultsLocators } from './runner';
import { buildVarsPanelLocators } from './request/vars';

export const buildCommonLocators = (page: Page) => ({
  titleBar: buildTitleBarLocators(page),
  collectionHeader: buildCollectionHeaderLocators(page),
  collectionApp: buildCollectionAppLocators(page),
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
  aiAssist: buildAiAssistLocators(page),
  folder: buildFolderLocators(page),
  modal: buildModalLocators(page),
  openCollectionPicker: buildOpenCollectionPickerLocators(page),
  codeMirror: buildCodeMirrorLocators(page),
  dataTypeSelector: buildDataTypeSelectorLocators(page),
  filePicker: buildFilePickerLocators(page),
  // The variable-info popup shown when hovering a `{{var}}` token in an editor.
  varInfoPopup: buildVarInfoPopupLocators(page),
  auth: buildAuthLocators(page),
  presets: buildCollectionPresetsLocators(page),
  tags: buildTagsLocators(page),
  generateDocs: buildGenerateDocsLocators(page),
  runnerResults: buildRunnerResultsLocators(page),
  response: buildResponseLocators(page),
  timeline: buildTimelineLocators(page),
  plusMenu: buildCollectionsPlusMenuLocators(page),
  import: buildImportCollectionLocators(page),
  export: buildExportCollectionLocators(page),
  /**
   * Build generic table locators for any table with a testId
   * @param testId - The testId of the table
   * @returns Table locators object
   */
  table: buildTableLocator(page),
  varsPanel: buildVarsPanelLocators(page),
  assertionsTable: buildAssertionsTableLocator(page)
});

export const getTableCell = (row: any, index: number) => row.locator('td').nth(index + 1);

export const buildGrpcCommonLocators = (page: Page) => ({
  ...buildCommonLocators(page),
  ...buildGrpcLocators(page)
});
