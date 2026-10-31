// Legacy entry point: every helper now lives in playwright/pages or playwright/support.
// Kept as re-exports so existing imports keep working; removed in the cleanup PR.

export {
  getResponseBody,
  expectResponseContains,
  selectResponsePaneTab,
  selectResponsePaneTabViaOverflow,
  switchResponseFormat,
  switchToPreviewTab,
  switchToEditorTab,
  expandAllXmlNodes,
  clickResponseAction,
  resetResponse
} from '../../../playwright/pages/response';

export {
  sendRequest,
  sendRequestAndWaitForResponse,
  sendAndWaitForErrorCard,
  sendAndWaitForResponse
} from '../../../playwright/pages/request/send';

export {
  createExampleFromSidebar
} from '../../../playwright/pages/response-example';

export {
  setRequestUrlAndSave,
  fillRequestUrl,
  selectRequestPaneTab,
  saveRequest,
  openRequestPaneTabOverflow,
  requestPaneOverflowTabItem
} from '../../../playwright/pages/request/pane';

export {
  readRequestBody,
  selectRequestBodyMode,
  mockBrowseFiles,
  addMultipartFileToLastRow,
  removeFirstMultipartFile,
  setTextBody
} from '../../../playwright/pages/request/body';

export {
  addAssertion,
  editAssertion,
  deleteAssertion
} from '../../../playwright/pages/request/assertions';

export {
  selectScriptSubTab,
  addPreRequestScript,
  addPostResponseScript,
  writeScriptContent,
  readScriptContent,
  addTestScript
} from '../../../playwright/pages/request/script';

export {
  selectAuthMode
} from '../../../playwright/pages/request/auth';

export {
  expectRequestMaxRedirects
} from '../../../playwright/pages/request/settings';

export {
  editCodeMirrorEditor,
  setCodeMirrorEditorValue,
  setCodeMirrorValue
} from '../../../playwright/pages/shared-ui/code-editor';

export {
  fieldEditor,
  typeIntoField,
  writeFieldValue,
  readField
} from '../../../playwright/pages/shared-ui/single-line-editor';

export {
  createRequest,
  createUntitledRequest,
  createTransientRequest,
  createTransientRequestFromPreset,
  saveTransientRequestAs
} from '../../../playwright/pages/request/create';

export {
  addGrpcMessage,
  generateGrpcSampleMessage,
  selectGrpcMethod,
  sendGrpcRequest,
  streamGrpcMessagesAndEndCall
} from '../../../playwright/pages/request/grpc';

export {
  openEnvironmentSelector,
  openEnvironmentConfigTab,
  closeEnvironmentPanel,
  selectEnvironment
} from '../../../playwright/pages/environment/selector';

export {
  importEnvironment,
  createEnvironment,
  renameEnvironment,
  openEnvironmentInSettings,
  setEnvironmentInheritance,
  copyEnvironment,
  deleteEnvironment,
  deleteAllGlobalEnvironments,
  saveEnvironment,
  openImportReview
} from '../../../playwright/pages/environment/settings';

export {
  getEnvironmentColumnWidths,
  dragEnvironmentColumnDivider,
  addEnvironmentVariable,
  addEnvironmentVariables,
  addRowToActiveTab,
  cycleVariableSort,
  getVisibleVariableNames,
  dragVariableRow,
  setEnvironmentVariableValue,
  disableEnvironmentVariable,
  setEnvironmentSecrets,
  searchEnvironmentVariables
} from '../../../playwright/pages/environment/variables';

export {
  closeAllCollections,
  openCollection,
  openCollectionFromDialog,
  createCollection,
  deleteCollectionFromOverview,
  closeOpenCollectionModal,
  removeCollection
} from '../../../playwright/pages/collection/manage';

export {
  dismissImportIssuesToasts,
  importCollection,
  openBulkImportModal
} from '../../../playwright/pages/collection/import';

export {
  openShareCollectionModal,
  openExportToPostmanModal,
  closeExportToPostmanModal,
  exportCollectionToPostman,
  exportCollectionAsSingleYaml,
  exportCollectionAsZip
} from '../../../playwright/pages/collection/export';

export {
  setRequestTypePreset,
  setRequestUrlPreset,
  openCollectionSettings,
  selectCollectionPaneTab,
  selectCollectionScriptPaneTab,
  focusCollectionSettingsTab,
  addCollectionScript
} from '../../../playwright/pages/collection/settings';

export {
  generateCollectionDocs
} from '../../../playwright/pages/collection/docs';

export {
  selectfolderPaneTab,
  selectFolderScriptPaneTab,
  focusFolderSettingsTab,
  addFolderScript,
  saveFolderSettings,
  openFolderSettings,
  openFolderSettingsByPath,
  selectFolderSettingsTab
} from '../../../playwright/pages/folder/settings';

export {
  addTag,
  removeTag
} from '../../../playwright/pages/shared-ui/tags';

export {
  dismissModalIfOpen,
  clickOutsideModal
} from '../../../playwright/pages/shared-ui/modal';

export {
  setTableRowDescriptionValue
} from '../../../playwright/pages/shared-ui/table';

export {
  closeAllTabs,
  closeAllOpenTabs,
  switchToOpenTab
} from '../../../playwright/pages/request-tabs';

export {
  createWorkspace,
  switchWorkspace,
  openWorkspaceFromDialog
} from '../../../playwright/pages/workspace/workspace';

export {
  renameWsMessage
} from '../../../playwright/pages/request/websocket';

export {
  setAppCode,
  setAppEnabled,
  readAppEditor,
  requestPaneAppTab,
  activeAppPreviewSlot,
  activeAppView,
  appEmptyState,
  previewApp,
  exitApp,
  selectViewMode,
  getAppWebviewSrc,
  getAppWebviewHtml,
  evalInActiveAppGuest,
  waitForAppGuestReady,
  createApp,
  selectAppView
} from '../../../playwright/pages/request/app';

export {
  expectTransientRequestOpened,
  expectLinkOpensRequest,
  expectLinkOpensExternally,
  expectLinkDoesNotOpenRequest,
  expectNoLink,
  LINK_AWARE_COLLECTION_NAME,
  LINK_CLICK_MODIFIER
} from '../../../playwright/pages/shared-ui/code-editor-links';

export {
  openUrlVarTooltip,
  dismissVarTooltip,
  openEnvValueVarTooltip
} from '../../../playwright/pages/variable/tooltip';

export {
  elementIsInsideDropdown
} from '../../../playwright/pages/shared-ui/dropdown';

export {
  scrollVirtuosoRowIntoView
} from '../../../playwright/pages/shared-ui/virtual-list';

export {
  waitForReadyPage,
  readClipboard,
  setWindowContentSize,
  getScrollMetrics
} from '../../../playwright/support/app';

export {
  openSystemProxyPanel
} from '../../../playwright/pages/app-shell/preferences';

export {
  clickEmptySidebarSpace,
  collapseFolder,
  expandCollection,
  expandFolder,
  openExampleFromSidebar,
  openFolderRequest,
  openRequest,
  openRequestInFolder,
  openfolder,
  toggleOpenCollectionItem,
  toggleRequestExamples
} from '../../../playwright/pages/sidebar/collection-tree';

export {
  chooseCloneLocation,
  cloneItem,
  copyItem,
  createFolder,
  createFolderViaModal,
  createRequestFromEmptyStateCta,
  createRequestViaModal,
  createRequestWithEditedFilename,
  deleteRequest,
  openCloneCollectionModal,
  openItemActionsMenu,
  openNewFolderModal,
  openNewRequestModal,
  openRenameModal,
  pasteIntoCollection,
  pasteIntoFolder,
  renameCollectionItem,
  renameItemTo,
  renameViaFilename,
  revealFilesystemName
} from '../../../playwright/pages/sidebar/item-actions';

export type { AssertionInput } from '../../../playwright/pages/request/assertions';
export type { CreateRequestOptions, CreateUntitledRequestOptions, CreateTransientRequestOptions } from '../../../playwright/pages/request/create';
export type { EnvironmentType } from '../../../playwright/pages/environment/selector';
export type { EnvironmentVariable } from '../../../playwright/pages/environment/variables';
export type { ImportCollectionOptions } from '../../../playwright/pages/collection/import';
export type { LinkAwareRequestType } from '../../../playwright/pages/shared-ui/code-editor-links';
export type { SandboxMode } from '../../../playwright/pages/collection/settings';
export type { ScriptSubTab } from '../../../playwright/pages/request/script';
