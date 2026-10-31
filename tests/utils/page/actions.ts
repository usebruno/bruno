import { test, expect, Page, Locator, ElectronApplication, waitForReadyPage as waitForReadyPageImpl } from '../../../playwright';
import process from 'node:process';
import { buildCommonLocators, buildGrpcCommonLocators } from './locators';
import { buildPreferencesLocators, openPreferences, selectPreferencesTab } from './preferences';
import { switchResponseFormat, switchToPreviewTab, switchToEditorTab, expandAllXmlNodes, getResponseBody, selectResponsePaneTab, selectResponsePaneTabViaOverflow, expectResponseContains, clickResponseAction, resetResponse } from '../../../playwright/pages/response';
import { sendRequest, sendRequestAndWaitForResponse, sendAndWaitForErrorCard, sendAndWaitForResponse } from '../../../playwright/pages/request/send';
import { createExampleFromSidebar } from '../../../playwright/pages/response-example';
import { selectRequestPaneTab, openRequestPaneTabOverflow, requestPaneOverflowTabItem, saveRequest, fillRequestUrl, setRequestUrlAndSave } from '../../../playwright/pages/request/pane';
import { selectRequestBodyMode, readRequestBody, setTextBody, mockBrowseFiles, addMultipartFileToLastRow, removeFirstMultipartFile } from '../../../playwright/pages/request/body';
import { addAssertion, editAssertion, deleteAssertion } from '../../../playwright/pages/request/assertions';
import { selectScriptSubTab, addPreRequestScript, addPostResponseScript, writeScriptContent, readScriptContent, addTestScript } from '../../../playwright/pages/request/script';
import { selectAuthMode } from '../../../playwright/pages/request/auth';
import { expectRequestMaxRedirects } from '../../../playwright/pages/request/settings';
import { editCodeMirrorEditor, setCodeMirrorEditorValue, setCodeMirrorValue } from '../../../playwright/pages/shared-ui/code-editor';
import { fieldEditor, typeIntoField, writeFieldValue, readField } from '../../../playwright/pages/shared-ui/single-line-editor';
import { createUntitledRequest, createTransientRequest, createTransientRequestFromPreset, createRequest, saveTransientRequestAs } from '../../../playwright/pages/request/create';
import { addGrpcMessage, generateGrpcSampleMessage, sendGrpcRequest, streamGrpcMessagesAndEndCall } from '../../../playwright/pages/request/grpc';
import {
  openEnvironmentSelector,
  selectEnvironment,
  openEnvironmentConfigTab,
  closeEnvironmentPanel
} from '../../../playwright/pages/environment/selector';
import {
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
import {
  addEnvironmentVariable,
  addEnvironmentVariables,
  addRowToActiveTab,
  setEnvironmentVariableValue,
  disableEnvironmentVariable,
  setEnvironmentSecrets,
  searchEnvironmentVariables,
  cycleVariableSort,
  getVisibleVariableNames,
  dragVariableRow,
  getEnvironmentColumnWidths,
  dragEnvironmentColumnDivider
} from '../../../playwright/pages/environment/variables';
import {
  closeAllCollections,
  openCollection,
  openCollectionFromDialog,
  createCollection,
  deleteCollectionFromOverview,
  closeOpenCollectionModal,
  removeCollection
} from '../../../playwright/pages/collection/manage';
import {
  dismissImportIssuesToasts,
  importCollection,
  openBulkImportModal
} from '../../../playwright/pages/collection/import';
import {
  openShareCollectionModal,
  openExportToPostmanModal,
  closeExportToPostmanModal,
  exportCollectionToPostman,
  exportCollectionAsSingleYaml,
  exportCollectionAsZip
} from '../../../playwright/pages/collection/export';
import {
  setRequestTypePreset,
  setRequestUrlPreset,
  openCollectionSettings,
  selectCollectionPaneTab,
  selectCollectionScriptPaneTab,
  focusCollectionSettingsTab,
  addCollectionScript
} from '../../../playwright/pages/collection/settings';
import {
  generateCollectionDocs
} from '../../../playwright/pages/collection/docs';
import {
  selectfolderPaneTab,
  selectFolderScriptPaneTab,
  focusFolderSettingsTab,
  addFolderScript,
  openFolderSettings,
  saveFolderSettings,
  openFolderSettingsByPath,
  selectFolderSettingsTab
} from '../../../playwright/pages/folder/settings';
import {
  addTag,
  removeTag
} from '../../../playwright/pages/shared-ui/tags';
import {
  dismissModalIfOpen
} from '../../../playwright/pages/shared-ui/modal';
import {
  setTableRowDescriptionValue
} from '../../../playwright/pages/shared-ui/table';

type SandboxMode = 'safe' | 'developer';

type WaitForAppReadyOptions = {
  timeout?: number;
};

/**
 * Read an element's scroll dimensions for asserting scroll/overflow behavior.
 */
export const getScrollMetrics = (locator: Locator) =>
  locator.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop }));

/**
 * Wait for the Electron app to have a ready, loaded window.
 * Handles cases where the first window is slow to appear.
 */
const waitForReadyPage = (
  app: ElectronApplication,
  options: WaitForAppReadyOptions = {}
) => waitForReadyPageImpl(app, options);

/**
 * Read the system clipboard through the renderer, which is where the app's copy
 * buttons write. Windows hands multi-line text back as CRLF, so line endings are
 * normalized and callers can compare against plain \n.
 * @param page - The page object
 * @returns The clipboard's text
 */
const readClipboard = async (page: Page): Promise<string> => {
  const text = await page.evaluate(() => navigator.clipboard.readText());
  return text.replace(/\r\n/g, '\n');
};

/**
 * Open a request by clicking on it in the sidebar
 * @param page - The page object
 * @param requestName - The name of the request to open
 * @returns void
 */
// const openRequest = async (page: Page, requestName: string) => {
//   await test.step(`Open request "${requestName}"`, async () => {
//     const locators = buildCommonLocators(page);
//     await locators.sidebar.request(requestName).click();
//     await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
//   });
// };

/**
 * Open the gRPC method dropdown and select a method by name
 * @param page - The page object
 * @param methodName - The name of the gRPC method to select (e.g. "BidiHello")
 */
const selectGrpcMethod = async (page: Page, methodName: string) => {
  await test.step(`Select gRPC method "${methodName}"`, async () => {
    const locators = buildGrpcCommonLocators(page);
    await locators.method.dropdownTrigger().click();
    await locators.method.dropdown().waitFor({ state: 'visible', timeout: 5000 });
    await locators.method.item(methodName).first().click();
    await expect(locators.method.selectedName()).toContainText(methodName);
  });
};

/**
 * Close every open request tab, discarding or saving based on the saveChanges flag.
 *
 * @param page - The page object
 * @returns void
 */
const closeAllOpenTabs = async (page: Page, saveChanges = false) => {
  await test.step(`Close all tabs, ${saveChanges ? 'saving' : 'discarding'} changes`, async () => {
    const locators = buildCommonLocators(page);
    const closableTabs = locators.tabs.closableTabs();
    const confirmClose = page.locator('.bruno-modal').filter({ hasText: 'Unsaved changes' });
    const resolveButton = saveChanges
      ? confirmClose.getByRole('button', { name: /^Save( All)?$/ })
      : confirmClose.getByRole('button', { name: 'Don\'t Save' });

    const pressCloseAllTabs = async () => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('ControlOrMeta+Shift+W');
    };

    await pressCloseAllTabs();

    await expect(async () => {
      if (await confirmClose.isVisible()) {
        await resolveButton.click();
      }
      await expect(closableTabs).toHaveCount(0, { timeout: 1000 });
    }).toPass({ timeout: 15000 });
  });
};

/**
 * Close all open request tabs using the right-click context menu
 * @param page - The page object
 * @returns void
 */
const closeAllTabs = async (page: Page) => {
  await test.step('Close all tabs', async () => {
    // Find actual request tabs (those with .tab-method, not Overview/Environments)
    const requestTabLabel = page.locator('.request-tab').filter({ has: page.locator('.tab-method') }).locator('.tab-label').first();
    if (!(await requestTabLabel.isVisible().catch(() => false))) {
      return; // No request tabs to close
    }

    // Right-click on the tab label to open context menu. Aim at its left edge
    // on a short tab name the close-gradient overlay covers the label's centre.
    await requestTabLabel.click({ button: 'right', position: { x: 5, y: 5 } });

    // Wait for the dropdown menu to appear
    const dropdown = page.locator('.tippy-box.dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    // Click "Close All" menu item
    await dropdown.locator('[role="menuitem"][data-item-id="close-all"]').click();

    // Handle "Unsaved Transient Requests" modal if it appears
    const discardAllButton = page.getByRole('button', { name: 'Discard All' });
    if (await discardAllButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardAllButton.click();
    }

    const saveTransientModal = page.getByTestId('save-transient-request-modal');
    if (await saveTransientModal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveTransientModal.getByRole('button', { name: 'Cancel' }).click();
      await expect(saveTransientModal).toBeHidden();
    }
  });
};

// Switch to an already-open request tab by its label (e.g. transient tabs are "Untitled N").
const switchToOpenTab = async (page: Page, label: string) => {
  await test.step(`Switch to tab "${label}"`, async () => {
    const tab = page.getByTestId('request-tab').filter({ has: page.getByText(label, { exact: true }) });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });
};

/**
 * Create a new workspace via the title bar dropdown inline rename flow
 * @param page - The page object
 * @param workspaceName - The name of the workspace to create
 * @returns void
 */
const createWorkspace = async (page: Page, workspaceName: string) => {
  await test.step(`Create workspace "${workspaceName}"`, async () => {
    await page.locator('.workspace-name-container').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();

    const renameInput = page.locator('.workspace-name-input');
    await expect(renameInput).toBeVisible({ timeout: 5000 });
    await renameInput.fill(workspaceName);
    await renameInput.press('Enter');

    await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName, { timeout: 5000 });
  });
};

/**
 * Switch to an existing workspace via the title bar dropdown
 * @param page - The page object
 * @param workspaceName - The name of the workspace to switch to
 * @returns void
 */
const switchWorkspace = async (page: Page, workspaceName: string) => {
  await test.step(`Switch to workspace "${workspaceName}"`, async () => {
    await page.locator('.workspace-name-container').click();
    await page
      .locator('.workspace-item, .dropdown-item')
      .filter({ has: page.getByText(workspaceName, { exact: true }) })
      .click();
    await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName, { timeout: 5000 });
  });
};

// --- CodeMirror link-aware assertions (open-as-transient-request feature) -------------------

type LinkAwareRequestType = 'http' | 'graphql' | 'grpc' | 'ws';

// Name of the committed fixture collection under tests/codeeditor-state/codemirror/fixtures.
const LINK_AWARE_COLLECTION_NAME = 'codemirror-linkaware';

// Cmd on macOS, Ctrl elsewhere — matches isCmdOrCtrlPressed() in linkAware.js.
const LINK_CLICK_MODIFIER: 'Meta' | 'Control' = process.platform === 'darwin' ? 'Meta' : 'Control';

const LINK_AWARE_METHOD_LABEL: Record<LinkAwareRequestType, string | null> = {
  http: null, // HTTP shows the verb (GET/POST/...), not a fixed label
  graphql: 'GQL',
  grpc: 'gRPC',
  ws: 'WS'
};

const linkAwareUrlBarCm = (page: Page, type: LinkAwareRequestType): Locator =>
  type === 'grpc'
    ? buildGrpcCommonLocators(page).request.queryUrlContainer().locator('.CodeMirror')
    : buildCommonLocators(page).request.urlInput();

/** Asserts the currently active tab is a freshly-created transient request of the given type. */
const expectTransientRequestOpened = async (page: Page, opts: { type: LinkAwareRequestType; url?: string }) => {
  const tab = page.locator('.request-tab.active');
  await expect(tab).toContainText('Untitled', { timeout: 10000 });

  const expectedLabel = LINK_AWARE_METHOD_LABEL[opts.type];
  if (expectedLabel) {
    await expect(tab.locator('.tab-method')).toHaveText(expectedLabel, { timeout: 5000 });
  } else {
    await expect(tab.locator('.tab-method')).not.toHaveText('', { timeout: 5000 });
  }

  if (opts.url && opts.type !== 'ws') {
    await expect.poll(
      () => linkAwareUrlBarCm(page, opts.type).evaluate((el: any) => el.CodeMirror?.getValue() ?? ''),
      { timeout: 5000 }
    ).toBe(opts.url);
  }
};

/** Plain click on the marked link — asserts a new transient request of `type` opens with `url`. */
const expectLinkOpensRequest = async (page: Page, cm: Locator, opts: { type: LinkAwareRequestType; url: string }) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await expectTransientRequestOpened(page, opts);
};

/** Modifier+click on the marked link — must fall back to "open externally", no new tab. */
const expectLinkOpensExternally = async (page: Page, cm: Locator) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  const tabCountBefore = await page.locator('.request-tab').count();
  await link.click({ modifiers: [LINK_CLICK_MODIFIER] });
  await page.waitForTimeout(300); // no new-tab locator to await — asserting absence of change
  await expect(page.locator('.request-tab')).toHaveCount(tabCountBefore);
};

/**
 * Editable fields (Params, Vars, Headers, ...) only mark URLs and let Cmd/Ctrl+Click open them
 * externally — a plain click just places the cursor, matching the URL bar's pre-existing
 * behaviour. Click-to-open-as-a-request is reserved for response previews.
 */
const expectLinkDoesNotOpenRequest = async (page: Page, cm: Locator) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await expect(cm).toContainClass('CodeMirror-focused');

  await expectLinkOpensExternally(page, cm);
};

/**
 * A URL-looking value must behave as plain text (e.g. `{{var}}`-interpolated, `ws://`, or a
 * field with link-awareness disabled): clicking it — with or without the open-externally
 * modifier — must be handled as a normal text click (CodeMirror focuses and places the
 * cursor), never intercepted to open a transient request.
 */
const expectNoLink = async (cm: Locator) => {
  await cm.click();
  await expect(cm).toContainClass('CodeMirror-focused');

  await cm.click({ modifiers: [LINK_CLICK_MODIFIER] });
  await expect(cm).toContainClass('CodeMirror-focused');
};

type DialogOptions = {
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
};

const openWorkspaceFromDialog = async (app: any, page: any, targetPath: string) => {
  await app.evaluate(
    ({ dialog }: { dialog: DialogOptions }, workspacePath: string) => {
      dialog.showOpenDialog = () =>
        Promise.resolve({ canceled: false, filePaths: [workspacePath] });
    },
    targetPath
  );

  await page.getByTestId('workspace-menu').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
};

/**
 * Toggle the "Enable App" request setting idempotently (Settings tab).
 * Enabling exposes the App tab and the Request/App/File view-mode toggle.
 * @param page - The page object
 * @param enabled - Whether apps should be enabled for the request
 */
const setAppEnabled = async (page: Page, enabled: boolean) => {
  await test.step(`Set Enable App ${enabled ? 'ON' : 'OFF'}`, async () => {
    await selectRequestPaneTab(page, 'Settings');
    const toggle = page.getByTestId('enable-app-toggle');
    await expect(toggle).toBeVisible();
    const current = (await toggle.getAttribute('aria-checked')) === 'true';
    if (current !== enabled) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
    }
  });
};

/**
 * Set the request's app code. Enables apps in the request settings (the App
 * tab is hidden otherwise), opens the App tab and writes the editor value
 * directly via the CodeMirror API (avoids auto-close-bracket corruption when
 * typing HTML/JS char-by-char). The app view must not be active (editor visible).
 * @param page - The page object
 * @param code - The HTML/JS app code
 */
const setAppCode = async (page: Page, code: string) => {
  await setAppEnabled(page, true);
  await test.step('Set app code', async () => {
    await selectRequestPaneTab(page, 'App');
    const editor = appCodeEditor(page);
    await editor.waitFor({ state: 'visible' });
    await editor.evaluate((el, val) => {
      const cm = (el as any).CodeMirror;
      if (cm) cm.setValue(val);
    }, code);
  });
};

/**
 * The CodeMirror element of the request-level App-tab editor.
 * @param page - The page object
 */
const appCodeEditor = (page: Page) => page.getByTestId('app-code-editor').locator('.CodeMirror').first();

/**
 * Read the app code currently loaded in the App-tab editor (via the CodeMirror API).
 * @param page - The page object
 * @returns The editor's current value
 */
const readAppEditor = (page: Page): Promise<string | undefined> =>
  appCodeEditor(page).evaluate((el) => (el as any).CodeMirror?.getValue());

/**
 * The App tab of the request pane tab bar.
 * @param page - The page object
 */
const requestPaneAppTab = (page: Page) => page.getByTestId('responsive-tab-app');

/**
 * The keep-alive preview slot of the ACTIVE tab. The AppPreviewKeepAlive
 * overlay keeps app views of background tabs mounted (hidden) and the Electron
 * instance is shared across tests in a worker, so bare app-view lookups can
 * match a stale slot from another test. Always scope through the active slot.
 * @param page - The page object
 */
const activeAppPreviewSlot = (page: Page) => page.locator('.app-preview-slot.active');

/**
 * The app view of the ACTIVE tab (see activeAppPreviewSlot).
 * @param page - The page object
 */
const activeAppView = (page: Page) => activeAppPreviewSlot(page).getByTestId('app-view');

/**
 * The shared "No app yet" empty state, rendered by both the request-level app
 * view and the standalone collection app whenever the app has no code.
 * @param page - The page object
 */
const appEmptyState = (page: Page) => activeAppPreviewSlot(page).getByTestId('empty-app-state');

/**
 * Open the app view via the App tab's "Preview" button. Asserts the app view
 * takes over the request/response area.
 * @param page - The page object
 */
const previewApp = async (page: Page) => {
  await test.step('Preview app (App tab button)', async () => {
    await selectRequestPaneTab(page, 'App');
    await page.getByTestId('app-preview-btn').click();
    await expect(activeAppView(page)).toBeVisible({ timeout: 5000 });
  });
};

/**
 * Exit app mode via the app view's "Exit to editor" button.
 * @param page - The page object
 */
const exitApp = async (page: Page) => {
  await test.step('Exit app mode', async () => {
    await activeAppView(page).getByTestId('app-exit-button').click();
    await expect(activeAppView(page)).toHaveCount(0, { timeout: 5000 });
  });
};

/**
 * Switch the active request's view mode using the collection toolbar toggle.
 * @param page - The page object
 * @param mode - 'request' | 'app' | 'file'
 */
const selectViewMode = async (page: Page, mode: 'request' | 'app' | 'file') => {
  await test.step(`Switch view mode to "${mode}"`, async () => {
    await page.getByTestId(`view-mode-${mode}`).click();
  });
};

/**
 * The document URL of the active app's <webview>. Guest URLs are unique per
 * app, so this identifies one guest exactly — preferable to picking the newest
 * WebContents, which silently binds to a leftover guest from an earlier test in
 * the same worker. Throws if no webview attaches within the timeout; callers
 * polling for a guest should catch and retry.
 */
const getAppWebviewSrc = async (page: Page): Promise<string> => {
  const webview = activeAppView(page).locator('webview');
  await webview.waitFor({ state: 'attached', timeout: 5000 });
  return (await webview.getAttribute('src')) || '';
};

/**
 * Evaluate `code` inside the active app's <webview> guest. The guest runs
 * out-of-process, so it is unreachable from the renderer page: the guest
 * WebContents is located in the Electron main process by the exact document
 * URL the active webview is showing, which identifies one guest even when
 * guests from earlier tests are still alive in the same worker.
 *
 * Returns undefined while the webview has not attached yet (it mounts only
 * after the document-registration IPC round-trip resolves), so expect.poll
 * callers can keep retrying instead of failing on a slow mount.
 */
const evalInActiveAppGuest = async (page: Page, electronApp: ElectronApplication, code: string): Promise<unknown> => {
  let src: string;
  try {
    src = await getAppWebviewSrc(page);
  } catch {
    return undefined;
  }
  return electronApp.evaluate(
    async ({ webContents }, { src: wanted, code: c }) => {
      const guest = webContents.getAllWebContents().find((wc) => {
        try {
          return wc.getType() === 'webview' && wc.getURL() === wanted;
        } catch {
          return false;
        }
      });
      if (!guest) return undefined;
      return await guest.executeJavaScript(c, true);
    },
    { src, code }
  );
};

/**
 * Wait until the active app's guest has booted far enough that `window.bru.ctx`
 * exists — the injected bootstrap has run and the ctx bridge is usable.
 */
const waitForAppGuestReady = async (page: Page, electronApp: ElectronApplication, options: { timeout?: number } = {}) => {
  await expect
    .poll(async () => evalInActiveAppGuest(page, electronApp, 'window.bru && typeof window.bru.ctx'), {
      timeout: options.timeout ?? 15000
    })
    .toBe('object');
};

/**
 * Create a standalone (collection-level or folder-level) app via the sidebar
 * context menu. Opens the new tab once created.
 * @param page - The page object
 * @param appName - Name to give the new app
 * @param parent - Either `{ collectionName }` for a collection-level app,
 *                 or `{ collectionName, folderName }` for a folder-level app.
 */
const createApp = async (
  page: Page,
  appName: string,
  parent: { collectionName: string; folderName?: string }
) => {
  await test.step(`Create app "${appName}" in ${parent.folderName ? `folder "${parent.folderName}"` : `collection "${parent.collectionName}"`}`, async () => {
    const locators = buildCommonLocators(page);

    if (parent.folderName) {
      const collectionScope = locators.sidebar.collectionScope(parent.collectionName);
      const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: parent.folderName });
      await folderRow.hover();
      await folderRow.locator('.menu-icon').click();
    } else {
      await locators.sidebar.collection(parent.collectionName).hover();
      const collectionAction = locators.actions.collectionActions(parent.collectionName);
      await expect(collectionAction).toBeVisible({ timeout: 2000 });
      await collectionAction.click();
    }

    await page.locator('.tippy-box:visible .dropdown-item').filter({ hasText: 'New App' }).click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'New App' });
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('input[name="appName"]').fill(appName);
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  });
};

/**
 * Switch the CollectionApp tab between Code and Preview views.
 * @param page - The page object
 * @param view - 'code' | 'preview'
 */
const selectAppView = async (page: Page, view: 'code' | 'preview') => {
  await test.step(`Switch collection app to "${view}"`, async () => {
    // Scope through the active keep-alive slot — hidden slots of background
    // app tabs (possibly from earlier tests in the shared Electron) also
    // render this toggle.
    await activeAppPreviewSlot(page).getByTestId(`collection-app-view-${view}`).click();
  });
};

/**
 * Rename a websocket message by double-clicking its label and typing a new name.
 * @param page - The page object
 * @param index - The zero-based index of the message in the list
 * @param name - The new message name
 */
const renameWsMessage = async (page: Page, index: number, name: string) => {
  await test.step(`Rename websocket message ${index} to "${name}"`, async () => {
    const { websocket } = buildCommonLocators(page);
    await websocket.message.label(index).dblclick();
    const nameInput = websocket.message.nameInput(index);
    await expect(nameInput).toBeVisible();
    await nameInput.selectText();
    await page.keyboard.type(name);
    await nameInput.press('Enter');
  });
};

const SETTLE_MS = 2_000;

/**
 * Scroll a row inside a react-virtuoso table (request/folder/collection vars or
 * env vars — both rendered with the `table-container` className) into view so it
 * mounts in the DOM. Virtuoso only keeps rows near the viewport mounted and can
 * restore a persisted scroll position, so reset to the top first — retried, to
 * beat that restore — then walk down until `target` mounts.
 */
const scrollVirtuosoRowIntoView = async (page: Page, target: Locator) => {
  if (await target.count()) {
    await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
    return;
  }

  const scroll = (toTop: boolean) => page.evaluate((toTop) => {
    let moved = false;
    document.querySelectorAll('.table-container').forEach((el) => {
      const before = el.scrollTop;
      el.scrollTop = toTop ? 0 : el.scrollTop + el.clientHeight * 0.7 + 80;
      if (el.scrollTop !== before) moved = true;
    });
    return moved;
  }, toTop);

  for (let i = 0; i < 5; i++) {
    await scroll(true);
    await page.waitForTimeout(120);
    if (await target.count()) {
      await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
      return;
    }
  }

  for (let i = 0; i < 40; i++) {
    if (await target.count()) break;
    if (!(await scroll(false))) break;
    await page.waitForTimeout(120);
  }
  await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
};

/**
 * @param page - The page object
 */
const dismissVarTooltip = async (page: Page) => {
  await page.locator('body').click();
};

/**
 * Hover a `{{var}}` token in the URL editor and return its (visible) info tooltip.
 * @param page - The page object
 * @param varName - The variable name inside the braces
 * @param state - Highlight class to match: 'valid' (known) or 'invalid' (unknown); omit to match either
 * @returns The tooltip popup locator
 */
const openUrlVarTooltip = async (
  page: Page,
  varName: string,
  state?: 'valid' | 'invalid'
): Promise<Locator> => {
  const { request, varInfoPopup } = buildCommonLocators(page);
  // Dismiss any previously-open tooltip first.
  await page.mouse.move(0, 0);
  await request.urlVariableToken(varName, state).hover();

  const tooltip = varInfoPopup.all().first();
  await expect(tooltip).toBeVisible();
  return tooltip;
};

/**
 * Hover a `{{var}}` token inside another row's Value cell in the (collection or global)
 * environment table itself, and return its (visible) info tooltip. Use this for the
 * "go to definition from inside the environment table it would target" scenario, as opposed
 * to `openUrlVarTooltip` which hovers a token in a request's URL bar.
 * @param page - The page object
 * @param rowName - The name of the environment row whose Value cell contains the token
 * @param tokenName - The variable name inside the braces to hover
 * @param state - Highlight class to match: 'valid' (known) or 'invalid' (unknown); omit to match either
 * @returns The tooltip popup locator
 */
const openEnvValueVarTooltip = async (
  page: Page,
  rowName: string,
  tokenName: string,
  state?: 'valid' | 'invalid'
): Promise<Locator> => {
  const { environment, varInfoPopup } = buildCommonLocators(page);
  const selector = state ? `.cm-variable-${state}` : '.cm-variable-valid, .cm-variable-invalid';
  // Dismiss any previously-open tooltip first.
  await page.mouse.move(0, 0);
  await environment.varRowValueEditor(rowName).locator(selector).filter({ hasText: tokenName }).first().hover();

  const tooltip = varInfoPopup.all().first();
  await expect(tooltip).toBeVisible();
  return tooltip;
};

/**
 * Returns true if the element is on top at its centre (not hidden behind a header),
 * i.e. the topmost element at its centre is inside a dropdown/tippy container.
 * @param locator - The dropdown item locator
 * @returns Whether the item is the topmost element at its own centre
 */
const elementIsInsideDropdown = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box, 'dropdown item should have a layout box').not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  return locator.page().evaluate(
    ({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.tippy-box, .dropdown')),
    { x, y }
  );
};

/**
* Open the System Proxy panel in the Preferences dialog and wait for the refresh button to be visible.
* @param page - The page object
*/

const openSystemProxyPanel = async (page: Page) => {
  await openPreferences(page);
  await selectPreferencesTab(page, 'Proxy');

  const systemProxyLocators = buildPreferencesLocators(page).systemProxy;
  await systemProxyLocators.systemProxyMode().click();
  await systemProxyLocators.systemProxyRefreshButton().waitFor({ state: 'visible' });
};

// Sidebar item actions: clone / copy / paste / rename / create, opened through a
// row's menu.

/**
 * Clicks outside the modal backdrop to test click-outside behavior.
 * @param page - The Playwright Page object
 */
const clickOutsideModal = async (page: Page) => {
  const { modal } = buildCommonLocators(page);

  await modal.backdrop().click({
    position: { x: 10, y: 10 }
  });
};

const getAppWebviewHtml = async (page: Page, electronApp: ElectronApplication): Promise<string> => {
  await waitForAppGuestReady(page, electronApp);
  return (await evalInActiveAppGuest(page, electronApp, 'document.documentElement.outerHTML')) as string;
};

/**
 * Resizes the main window's content area and waits until the renderer reports the new width.
 * @param app - The Electron app owning the window
 * @param page - The Playwright page object
 * @param size - The content width and height to resize to
 * @returns void
 */
const setWindowContentSize = async (app: ElectronApplication, page: Page, size: { width: number; height: number }) => {
  await app.evaluate(({ BrowserWindow }, { width, height }) => {
    BrowserWindow.getAllWindows()[0].setContentSize(width, height);
  }, size);

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(size.width);
};

export {
  waitForReadyPage,
  readClipboard,
  setRequestUrlAndSave,
  openUrlVarTooltip,
  dismissVarTooltip,
  openEnvValueVarTooltip,
  scrollVirtuosoRowIntoView,
  dismissImportIssuesToasts,
  closeAllCollections,
  openCollection,
  openCollectionFromDialog,
  createCollection,
  createRequest,
  createUntitledRequest,
  createTransientRequest,
  createTransientRequestFromPreset,
  setRequestTypePreset,
  setRequestUrlPreset,
  fillRequestUrl,
  deleteCollectionFromOverview,
  importCollection,
  openBulkImportModal,
  closeOpenCollectionModal,
  removeCollection,
  openEnvironmentSelector,
  openEnvironmentConfigTab,
  importEnvironment,
  createEnvironment,
  renameEnvironment,
  openEnvironmentInSettings,
  getEnvironmentColumnWidths,
  dragEnvironmentColumnDivider,
  setEnvironmentInheritance,
  copyEnvironment,
  deleteEnvironment,
  addEnvironmentVariable,
  addEnvironmentVariables,
  addRowToActiveTab,
  cycleVariableSort,
  getVisibleVariableNames,
  dragVariableRow,
  setEnvironmentVariableValue,
  disableEnvironmentVariable,
  setEnvironmentSecrets,
  searchEnvironmentVariables,
  deleteAllGlobalEnvironments,
  saveEnvironment,
  closeEnvironmentPanel,
  selectEnvironment,
  sendRequest,
  selectfolderPaneTab,
  selectFolderScriptPaneTab,
  openCollectionSettings,
  selectCollectionPaneTab,
  selectCollectionScriptPaneTab,
  focusFolderSettingsTab,
  focusCollectionSettingsTab,
  getResponseBody,
  expectResponseContains,
  selectRequestPaneTab,
  readRequestBody,
  expectRequestMaxRedirects,
  selectRequestBodyMode,
  selectResponsePaneTab,
  selectResponsePaneTabViaOverflow,
  mockBrowseFiles,
  addMultipartFileToLastRow,
  removeFirstMultipartFile,
  sendRequestAndWaitForResponse,
  switchResponseFormat,
  switchToPreviewTab,
  switchToEditorTab,
  expandAllXmlNodes,
  clickResponseAction,
  addAssertion,
  editAssertion,
  deleteAssertion,
  saveRequest,
  addGrpcMessage,
  generateGrpcSampleMessage,
  selectGrpcMethod,
  sendGrpcRequest,
  streamGrpcMessagesAndEndCall,
  closeAllTabs,
  closeAllOpenTabs,
  switchToOpenTab,
  createWorkspace,
  switchWorkspace,
  selectScriptSubTab,
  editCodeMirrorEditor,
  setCodeMirrorEditorValue,
  addPreRequestScript,
  addPostResponseScript,
  writeScriptContent,
  readScriptContent,
  addTestScript,
  addFolderScript,
  addCollectionScript,
  sendAndWaitForErrorCard,
  sendAndWaitForResponse,
  resetResponse,
  selectAuthMode,
  fieldEditor,
  typeIntoField,
  writeFieldValue,
  readField,
  createExampleFromSidebar,
  openWorkspaceFromDialog,
  setCodeMirrorValue,
  expectTransientRequestOpened,
  expectLinkOpensRequest,
  expectLinkOpensExternally,
  expectLinkDoesNotOpenRequest,
  expectNoLink,
  LINK_AWARE_COLLECTION_NAME,
  LINK_CLICK_MODIFIER,
  generateCollectionDocs,
  openShareCollectionModal,
  openExportToPostmanModal,
  closeExportToPostmanModal,
  dismissModalIfOpen,
  exportCollectionToPostman,
  exportCollectionAsSingleYaml,
  exportCollectionAsZip,
  addTag,
  removeTag,
  saveFolderSettings,
  openFolderSettings,
  openFolderSettingsByPath,
  selectFolderSettingsTab,
  setTableRowDescriptionValue,
  setAppCode,
  setAppEnabled,
  readAppEditor,
  requestPaneAppTab,
  openRequestPaneTabOverflow,
  requestPaneOverflowTabItem,
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
  selectAppView,
  renameWsMessage,
  elementIsInsideDropdown,
  openSystemProxyPanel,
  setTextBody,
  saveTransientRequestAs,
  openImportReview,
  clickOutsideModal,
  setWindowContentSize
};

export type { SandboxMode, LinkAwareRequestType };
export type { ImportCollectionOptions } from '../../../playwright/pages/collection/import';
export type { EnvironmentType } from '../../../playwright/pages/environment/selector';
export type { EnvironmentVariable } from '../../../playwright/pages/environment/variables';
export type { AssertionInput } from '../../../playwright/pages/request/assertions';
export type { ScriptSubTab } from '../../../playwright/pages/request/script';
export type { CreateRequestOptions, CreateUntitledRequestOptions, CreateTransientRequestOptions } from '../../../playwright/pages/request/create';

// Moved to playwright/pages/sidebar/. Re-exported for existing deep imports of utils/page/actions.
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
