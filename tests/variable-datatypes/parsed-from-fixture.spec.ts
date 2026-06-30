import fs from 'fs';
import path from 'path';
import { test, expect, Page, Locator } from '../../playwright';
import {
  saveRequest,
  scrollVirtuosoRowIntoView,
  selectEnvironment,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequestAndWaitForResponse
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

/**
 * These tests cover the DataTypeSelector on the surfaces where it remains
 * after scoping the feature down: request vars, collection environment
 * vars, and global environment vars. Query params, path params, headers,
 * and form-data fields no longer expose dataType, so they are not asserted
 * here.
 *
 * Fixtures under `fixtures/workspace/collections/{bru,yml}` declare a single
 * request whose vars block carries one row per supported dataType (string,
 * number, boolean, object). Each describe block ends with a save test that
 * mutates one row's dataType via the selector and asserts the change
 * round-trips through the serializer to the on-disk file.
 */

const BRU_COLLECTION = 'datatypes-bru';
const YML_COLLECTION = 'datatypes-yml';

type VarScope = 'request' | 'folder' | 'collection';

/**
 * DataType expectations for each variable scope. Every scope declares one
 * row per supported dataType (string, number, boolean, object). The test
 * navigates to each scope's Vars page and asserts the type label.
 */
const VAR_TYPE_TABLE: Array<{ scope: VarScope; tableId: string; rows: Array<[string, string]> }> = [
  {
    scope: 'request',
    tableId: 'request-vars-req',
    rows: [
      ['req_str', 'string'],
      ['req_num', 'number'],
      ['req_bool', 'boolean'],
      ['req_obj', 'object']
    ]
  },
  {
    scope: 'folder',
    tableId: 'folder-vars-req',
    rows: [
      ['fold_str', 'string'],
      ['fold_num', 'number'],
      ['fold_bool', 'boolean'],
      ['fold_obj', 'object']
    ]
  },
  {
    scope: 'collection',
    tableId: 'collection-vars-req',
    rows: [
      ['coll_str', 'string'],
      ['coll_num', 'number'],
      ['coll_bool', 'boolean'],
      ['coll_obj', 'object']
    ]
  }
];

/**
 * Open a request that lives at `collections/{bru|yml}/folder/<name>.{bru|yml}`.
 * Defaults to the JSON-body `request` fixture; pass `multipart` to open the
 * sibling multipart-form request. Expands the collection and folder rows as
 * needed. Both fixture collections share the same folder/request names, so
 * we scope to the collection wrapper to keep strict-mode happy.
 */
const openRequestInCollection = async (
  page: Page,
  collectionName: string,
  requestName: string = 'request'
) => {
  const locators = buildCommonLocators(page);
  const collection = locators.sidebar.collection(collectionName);
  await expect(collection).toBeVisible();

  const collectionScope = locators.sidebar.collectionScope(collectionName);

  const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: 'folder' });
  if (!(await folderRow.isVisible().catch(() => false))) {
    await collection.click();
    await expect(folderRow).toBeVisible();
  }

  const requestLink = collectionScope.locator('.collection-item-name').filter({ hasText: requestName });
  if (!(await requestLink.isVisible().catch(() => false))) {
    await folderRow.click();
    await expect(requestLink).toBeVisible();
  }

  await requestLink.click();
  await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
};

/**
 * Rows in `EditableTable` carry `data-row-name="{name}"`, derived from the
 * key-field column. Use that directly so row matching works regardless of
 * whether the name cell renders a plain `<input>` or a CodeMirror editor.
 */
const tableRowByName = (table: ReturnType<ReturnType<typeof buildCommonLocators>['table']>, name: string) =>
  table.rowByName(name);

const SLOW_RENDER_TIMEOUT_MS = 15_000;

const expectTypeLabel = async (row: Locator, label: string) => {
  await scrollVirtuosoRowIntoView(row.page(), row);
  const { dataTypeSelector } = buildCommonLocators(row.page());
  await expect(dataTypeSelector.typeLabel(row)).toHaveText(label, { timeout: SLOW_RENDER_TIMEOUT_MS });
};

/**
 * Open the DataTypeSelector for a row and pick a new type. The picker is a
 * MenuDropdown rendered via Tippy at the page scope, so the menu items
 * surface outside the row.
 */
const changeRowDataType = async (page: Page, row: Locator, newType: string) => {
  const { dataTypeSelector } = buildCommonLocators(page);
  const trigger = dataTypeSelector.typeLabel(row);
  await trigger.click();

  const menuItem = dataTypeSelector.menuItem(newType);
  await expect(menuItem).toBeVisible();
  await menuItem.click();

  await expect(trigger).toHaveText(newType);
  // Let the dispatched Redux mutation propagate before the caller saves.
  await page.waitForTimeout(300);
};

/**
 * Navigate to the Vars page for a given scope:
 * - `request`: open the request, then select the Vars pane tab.
 * - `folder`: dbl-click the `folder` row to open Folder Settings, then click the Vars tab.
 * - `collection`: click the collection row (single click opens Collection Settings),
 *   then click the Vars tab.
 *
 * The Vars table is rendered with `tableId="<scope>-vars"` (request-vars-req,
 * folder-vars-req, collection-vars-req).
 */
const openVarsPageForScope = async (page: Page, collectionName: string, scope: VarScope) => {
  const locators = buildCommonLocators(page);

  if (scope === 'request') {
    await openRequestInCollection(page, collectionName);
    await selectRequestPaneTab(page, 'Vars');
    return;
  }

  const collectionScope = locators.sidebar.collectionScope(collectionName);
  const collectionRow = locators.sidebar.collection(collectionName);
  await expect(collectionRow).toBeVisible();

  if (scope === 'folder') {
    const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: 'folder' });
    if (!(await folderRow.isVisible().catch(() => false))) {
      await collectionRow.click();
      await expect(folderRow).toBeVisible();
    }
    await folderRow.dblclick();
    await locators.paneTabs.folderSettingsTab('vars').click();
    return;
  }

  // scope === 'collection': clicking the collection name opens Collection Settings
  // (and expands the row if it was collapsed).
  await collectionRow.click();
  await locators.paneTabs.collectionSettingsTab('vars').click();
};

/**
 * Walk every scope declared in VAR_TYPE_TABLE, navigate to its Vars page, and
 * verify each row's `.type-label` matches the declared dataType.
 */
const expectAllVarLabels = async (page: Page, collectionName: string) => {
  for (const { scope, tableId, rows } of VAR_TYPE_TABLE) {
    await openVarsPageForScope(page, collectionName, scope);
    const table = buildCommonLocators(page).table(tableId);
    for (const [name, label] of rows) {
      await expectTypeLabel(tableRowByName(table, name), label);
    }
  }
};

/**
 * Close every open tab so each test starts clean. If a save failed earlier,
 * the "Unsaved changes" modal can intercept close clicks — dismiss it with
 * "Don't Save" so the next test isn't blocked.
 */
const closeAllTabs = async (page: Page) => {
  const closeButtons = page.locator('.request-tab [data-testid="request-tab-close-icon"]');
  for (let i = 0; i < 20; i++) {
    const count = await closeButtons.count();
    if (count === 0) break;
    await closeButtons.first().click({ force: true }).catch(() => {});
    const dontSave = page.getByRole('button', { name: 'Don\'t Save' });
    if (await dontSave.isVisible().catch(() => false)) {
      await dontSave.click().catch(() => {});
    }
    await page.waitForTimeout(50);
  }
};

// Number of `test(...)` blocks in the request fixture's tests script.
const EXPECTED_TEST_COUNT = 14;

/**
 * Send the request and verify every assertion in its `tests {}` block passes.
 * Reads the result from the response pane's Tests tab. Assumes the caller
 * has already activated the right environments (otherwise env-scoped tests
 * would fail).
 *
 * The fixture posts to the local testbench echo endpoint. We key off the
 * test summary line ("Tests (N), Passed: X, Failed: Y") since each dataType
 * check renders as a separate test row.
 */
const sendAndAssertAllTestsPass = async (page: Page) => {
  await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
  await selectResponsePaneTab(page, 'Tests');

  const { response } = buildCommonLocators(page);
  await expect(response.testSummary()).toContainText(`Tests (${EXPECTED_TEST_COUNT}), Passed: ${EXPECTED_TEST_COUNT}, Failed: 0`);

  // Catch any individual failure even if the summary text changes.
  await expect(response.testFailures()).toHaveCount(0);
};

/**
 * Convenience wrapper: activate the collection + global envs, then send and
 * verify all tests pass. Used by tests that own the env-selection step.
 */
const runAndAssertTestsPass = async (page: Page) => {
  await selectEnvironment(page, 'variables', 'collection');
  await selectEnvironment(page, 'variables', 'global');
  await sendAndAssertAllTestsPass(page);
};

/**
 * Open the Environments / Global Environments configuration tab for the
 * currently active env. Mirrors the UI flow: click env selector → switch to
 * the matching tab (collection or global) → click the "Configure" button.
 *
 * The collection/global tab in the dropdown is sticky across opens — if a
 * previous test selected a global env, the dropdown reopens on the global
 * tab. We always click the target tab explicitly so the right Configure
 * button is wired up regardless of prior state.
 */
const openEnvironmentSettings = async (page: Page, type: 'collection' | 'global') => {
  const locators = buildCommonLocators(page);
  await locators.environment.selector().click();
  if (type === 'global') {
    await locators.environment.globalTab().click();
  } else {
    await locators.environment.collectionTab().click();
  }
  await locators.environment.configureButton().click();
  const tabTitle = type === 'collection' ? 'Environments' : 'Global Environments';
  await expect(locators.tabs.activeRequestTab()).toContainText(tabTitle);
};

/**
 * Assert the DataTypeSelector inside an env-var row reports the expected label.
 * Variables and secrets render on separate tabs in the env editor, so activate
 * the tab that owns this var before asserting (pass `{ secret: true }` for
 * secret rows, which live on the Secrets tab).
 */
const expectEnvVarTypeLabel = async (page: Page, name: string, label: string, { secret = false } = {}) => {
  const { environment, dataTypeSelector } = buildCommonLocators(page);
  await (secret ? environment.secretsTab() : environment.variablesTab()).click();
  const row = environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  await expect(dataTypeSelector.typeLabel(row)).toHaveText(label, { timeout: SLOW_RENDER_TIMEOUT_MS });
};

/**
 * Secret env vars carry a dataType too: the value is never written to disk but
 * the dataType is, so the editor renders the declared type label. Asserted
 * before any request runs so the file-declared dataType isn't overwritten by a
 * runtime setEnvVar mutation. Covers the collection env (per fixture format)
 * and the shared global env.
 */
const runSecretDataTypeLabelAssertions = async (page: Page, collectionName: string) => {
  await openRequestInCollection(page, collectionName);
  await selectEnvironment(page, 'variables', 'collection');
  await selectEnvironment(page, 'variables', 'global');

  await openEnvironmentSettings(page, 'collection');
  await expectEnvVarTypeLabel(page, 'env_secret_num', 'number', { secret: true });
  await expectEnvVarTypeLabel(page, 'env_secret_bool', 'boolean', { secret: true });
  await expectEnvVarTypeLabel(page, 'env_secret_obj', 'object', { secret: true });

  await openEnvironmentSettings(page, 'global');
  await expectEnvVarTypeLabel(page, 'glob_secret_num', 'number', { secret: true });
  await expectEnvVarTypeLabel(page, 'glob_secret_bool', 'boolean', { secret: true });
  await expectEnvVarTypeLabel(page, 'glob_secret_obj', 'object', { secret: true });
};

/**
 * The DataTypeSelector renders a yellow `IconAlertCircle` whenever the
 * variable's value can't be coerced to the declared dataType (e.g.
 * dataType=number with value="not-a-number"). The icon's distinguishing
 * class is `text-yellow-600`, applied to the SVG itself.
 */
const mismatchIcon = (row: Locator) => buildCommonLocators(row.page()).dataTypeSelector.mismatchIcon(row);

// Popups are position:fixed and overlap the next token; the mouse-leave close
// timer is too slow between hovers, so we tear them down first.
const hoverVarInBody = async (page: Page, varName: string) => {
  // _hidePopup runs the popup's own cleanup (listeners, MaskedEditor.destroy,
  // inner CodeMirror teardown); raw .remove() leaks across the loop.
  await page.evaluate(() => {
    document.querySelectorAll('.CodeMirror-brunoVarInfo').forEach((el: any) => {
      if (typeof el._hidePopup === 'function') el._hidePopup({ immediate: true });
      else el.remove();
    });
  });
  const { request, varInfoPopup } = buildCommonLocators(page);
  await page.mouse.move(0, 0);
  await expect(varInfoPopup.all()).toHaveCount(0);

  const varToken = request.bodyVariableToken(varName).first();
  await expect(varToken).toBeVisible();

  const tooltip = varInfoPopup.byName(varName);
  await expect(async () => {
    await page.mouse.move(0, 0);
    await varToken.hover();
    await expect(tooltip).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: SLOW_RENDER_TIMEOUT_MS });
  return tooltip;
};

// Objects render as pretty-printed JSON in the popup — parse back and
// deep-compare so the assertion isn't coupled to whitespace.
const expectPopupParsedValue = async (tooltip: Locator, expected: string | number | boolean | object) => {
  const display = buildCommonLocators(tooltip.page()).varInfoPopup.valueDisplay(tooltip);
  await expect(display).toBeVisible();

  if (typeof expected === 'object' && expected !== null) {
    await expect.poll(async () => {
      const text = (await display.textContent()) ?? '';
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }).toEqual(expected);
  } else {
    await expect(display).toHaveText(String(expected));
  }
};

const executeAndOpenBody = async (page: Page) => {
  // The all-tests-pass assertion doubles as a wait for post-response
  // dispatches (main:script-environment-update) to land before we hover.
  await sendAndAssertAllTestsPass(page);
  await selectRequestPaneTab(page, 'Body');
};

const expectPopupMaskedValue = async (page: Page, varName: string, actualValue: string) => {
  const { varInfoPopup } = buildCommonLocators(page);
  const tooltip = await hoverVarInBody(page, varName);
  const display = varInfoPopup.editableValue(tooltip);
  await expect(display).toBeVisible();
  await expect(display).toHaveText('*'.repeat(actualValue.length));
  await expect(display).not.toContainText(actualValue);
  await expect(varInfoPopup.secretToggle(tooltip)).toBeVisible();
};

// Guards the editor seeding path: objects must not be dispatched as
// `[object Object]`, and confirms primitives still seed correctly under
// the JSON.stringify branch.
const expectPopupEditorOpensWith = async (tooltip: Locator, expected: string | object) => {
  const { varInfoPopup } = buildCommonLocators(tooltip.page());
  await varInfoPopup.editableValue(tooltip).click();
  const editor = varInfoPopup.editor(tooltip);
  await expect(editor).toBeVisible();
  const code = editor.locator('.CodeMirror-code');

  if (typeof expected === 'object' && expected !== null) {
    await expect.poll(async () => {
      const text = (await code.textContent()) ?? '';
      if (text.includes('[object Object]')) return text;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }).toEqual(expected);
  } else {
    await expect.poll(async () => (await code.textContent()) ?? '').toBe(String(expected));
  }
};

const BODY_VAR_VALUES: Array<[string, string | object]> = [
  ['coll_str', 'collection_string'],
  ['coll_num', '100'],
  ['coll_bool', 'false'],
  ['coll_obj', { scope: 'collection' }],
  ['fold_str', 'folder_string'],
  ['fold_num', '200'],
  ['fold_bool', 'true'],
  ['fold_obj', { scope: 'folder' }],
  ['req_str', 'request_string'],
  ['req_num', '42'],
  ['req_bool', 'true'],
  ['req_obj', { key: 'value' }],
  // Precision must survive the file → parse → coerce path.
  ['req_obj_precision', {
    integer: 123,
    negativeInteger: -99,
    zero: 0,
    float: 2.718,
    negativeFloat: -1.618,
    largeDouble: 12345.678901234567,
    smallDouble: 9.876e-12,
    booleanTrue: true,
    booleanFalse: false
  }],
  // {} must render as the object, not fall back to the empty string.
  ['req_obj_empty', {}],
  // String([1,2,3]) === "1,2,3" — distinct from the object regression.
  ['req_arr', [1, 2, 'three', true]],
  // @number with non-numeric data falls back to the raw string.
  ['mismatched_num', 'not-a-number'],
  ['env_str', 'env_string'],
  ['env_num', '300'],
  ['env_bool', 'true'],
  ['env_obj', { scope: 'env' }],
  // Falsy typed values are a known regression surface — must not render as empty.
  ['falsy_num', '0'],
  ['falsy_bool', 'false'],
  ['glob_str', 'global_string'],
  ['glob_num', '400'],
  ['glob_bool', 'false'],
  ['glob_obj', { scope: 'global' }],
  ['runtime_str', 'runtime_string'],
  ['runtime_num', '999'],
  ['runtime_bool', 'true'],
  ['runtime_obj', { nested: 'yes' }],
  ['inferred_env_num', '700'],
  ['inferred_env_bool', 'true'],
  ['inferred_env_obj', { from: 'script' }],
  ['inferred_glob_num', '800'],
  ['inferred_glob_bool', 'false'],
  ['inferred_glob_obj', { from: 'script' }]
];

// Asserted separately: the popup masks these and the value must never reach the DOM.
const BODY_SECRET_VAR_VALUES: Array<[string, string]> = [
  ['env_secret_str', 'secret_env_string'],
  ['glob_secret_str', 'secret_global_string']
];

const setupBodyHover = async (page: Page, collectionName: string) => {
  await openRequestInCollection(page, collectionName);
  await selectEnvironment(page, 'variables', 'collection');
  await selectEnvironment(page, 'variables', 'global');
  await executeAndOpenBody(page);
};

const runBodyHoverPopupAssertions = async (page: Page, collectionName: string) => {
  await setupBodyHover(page, collectionName);

  for (const [name, expected] of BODY_VAR_VALUES) {
    await expectPopupParsedValue(await hoverVarInBody(page, name), expected);
  }
  for (const [name, actual] of BODY_SECRET_VAR_VALUES) {
    await expectPopupMaskedValue(page, name, actual);
  }
};

const runBodyEditorSeedAssertions = async (page: Page, collectionName: string) => {
  await setupBodyHover(page, collectionName);

  // runtime_* are read-only in the popup, so they have no editable display to click.
  for (const [name, expected] of BODY_VAR_VALUES.filter(([n]) => !n.startsWith('runtime_'))) {
    await expectPopupEditorOpensWith(await hoverVarInBody(page, name), expected);
  }
};

test.afterEach(async ({ pageWithUserData: page }) => {
  await closeAllTabs(page);
});

// Both collection formats (.bru annotations and .yml { type, data }) must surface
// identical dataType behaviour, so the suite is defined once and run per fixture.
// Only the save round-trip differs (the on-disk shape), so it's passed in.
const runDataTypeSelectorTests = (
  collectionName: string,
  { savedRequestFile, savedDataTypeMatcher }: { savedRequestFile: string[]; savedDataTypeMatcher: RegExp }
) => {
  test('vars: all datatypes render correctly across collection / folder / request scopes', async ({ pageWithUserData: page }) => {
    await expectAllVarLabels(page, collectionName);
  });

  test('request vars: query params and headers do NOT expose the dataType selector', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, collectionName);
    await selectRequestPaneTab(page, 'Params');
    const queryTable = buildCommonLocators(page).table('query-params');
    await expect(queryTable.container().locator('.type-label')).toHaveCount(0);

    await selectRequestPaneTab(page, 'Headers');
    const headersTable = buildCommonLocators(page).table('request-headers');
    await expect(headersTable.container().locator('.type-label')).toHaveCount(0);
  });

  test('test script: every typed var across scopes asserts true', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, collectionName);
    await runAndAssertTestsPass(page);
  });

  test('multipart form: typed pre-request vars stringify on the wire', async ({ pageWithUserData: page }) => {
    // Asserts the toFormValue stringifier in
    // packages/bruno-electron/src/utils/form-data.js converts typed
    // (number/boolean/object) values to strings before form.append.
    await openRequestInCollection(page, collectionName, 'multipart');
    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
    await selectResponsePaneTab(page, 'Tests');
    const multipartResponse = buildCommonLocators(page).response;
    await expect(multipartResponse.testSummary()).toContainText('Tests (1), Passed: 1, Failed: 0');
    await expect(multipartResponse.testFailures()).toHaveCount(0);
  });

  test('form-urlencoded: typed pre-request vars stringify on the wire', async ({ pageWithUserData: page }) => {
    // form-urlencoded uses a separate code path from multipart:
    // buildFormUrlEncodedPayload in @usebruno/common coerces values via String().
    // Verifies typed (number/boolean/object) vars round-trip into the
    // application/x-www-form-urlencoded body and the echo endpoint echoes the wire form.
    await openRequestInCollection(page, collectionName, 'form_urlencoded');
    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
    await selectResponsePaneTab(page, 'Tests');
    const formUrlEncodedResponse = buildCommonLocators(page).response;
    await expect(formUrlEncodedResponse.testSummary()).toContainText('Tests (1), Passed: 1, Failed: 0');
    await expect(formUrlEncodedResponse.testFailures()).toHaveCount(0);
  });

  test('vars: warning icon shows when value does not match the declared dataType', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, collectionName);
    await selectRequestPaneTab(page, 'Vars');

    const table = buildCommonLocators(page).table('request-vars-req');

    // mismatched_num declares the number dataType but its value is "not-a-number" —
    // coercion fails, the value falls back to the raw string, so the row warns.
    const mismatchedRow = tableRowByName(table, 'mismatched_num');
    await expectTypeLabel(mismatchedRow, 'number');
    await expect(mismatchIcon(mismatchedRow)).toBeVisible();

    // req_num declares number with value 42 — no warning.
    const matchingRow = tableRowByName(table, 'req_num');
    await expectTypeLabel(matchingRow, 'number');
    await expect(mismatchIcon(matchingRow)).toHaveCount(0);

    // req_str defaults to the string dataType — no warning.
    const stringRow = tableRowByName(table, 'req_str');
    await expectTypeLabel(stringRow, 'string');
    await expect(mismatchIcon(stringRow)).toHaveCount(0);
  });

  test('script setEnvVar / setGlobalEnvVar: inferred dataType renders in the env editor', async ({
    restartApp,
    workspaceFixturePath
  }) => {
    // bru.setGlobalEnvVar persists changes to disk on dispatch — use restartApp
    // so the mutation lands in this test's tmp workspace and doesn't leak into
    // sibling tests (which share `pageWithUserData`'s fixture copy).
    expect(workspaceFixturePath).not.toBeNull();
    const app = await restartApp({});
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await openRequestInCollection(page, collectionName);
    await selectEnvironment(page, 'variables', 'collection');
    await selectEnvironment(page, 'variables', 'global');

    // Pre-request script seeds inferred_env_* and inferred_glob_* via
    // bru.setEnvVar / bru.setGlobalEnvVar. After send, the env stores those
    // vars with the inferred dataType attached.
    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });

    // The 200 status arrives before post-response IPC has propagated to redux.
    // Wait for the Tests panel to populate — that guarantees the runner finished
    // post-response work and the env state is in sync.
    await selectResponsePaneTab(page, 'Tests');
    await expect(
      buildCommonLocators(page).response.testSummary()
    ).toContainText(`Tests (${EXPECTED_TEST_COUNT}), Passed: ${EXPECTED_TEST_COUNT}`);

    await openEnvironmentSettings(page, 'collection');
    await expectEnvVarTypeLabel(page, 'inferred_env_num', 'number');
    await expectEnvVarTypeLabel(page, 'inferred_env_bool', 'boolean');
    await expectEnvVarTypeLabel(page, 'inferred_env_obj', 'object');
    // getDataTypeFromValue is strict — string content doesn't promote.
    await expectEnvVarTypeLabel(page, 'strict_num_str', 'string');
    await expectEnvVarTypeLabel(page, 'strict_bool_str', 'string');
    await expectEnvVarTypeLabel(page, 'strict_obj_str', 'string');

    await openEnvironmentSettings(page, 'global');
    await expectEnvVarTypeLabel(page, 'inferred_glob_num', 'number');
    await expectEnvVarTypeLabel(page, 'inferred_glob_bool', 'boolean');
    await expectEnvVarTypeLabel(page, 'inferred_glob_obj', 'object');
    await expectEnvVarTypeLabel(page, 'strict_glob_num_str', 'string');
  });

  test('env editor: typed falsy values (0, false) display their dataType label', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, collectionName);
    await selectEnvironment(page, 'variables', 'collection');
    await openEnvironmentSettings(page, 'collection');

    await expectEnvVarTypeLabel(page, 'falsy_num', 'number');
    await expectEnvVarTypeLabel(page, 'falsy_bool', 'boolean');

    await expectEnvVarTypeLabel(page, 'env_num', 'number');
    await expectEnvVarTypeLabel(page, 'env_bool', 'boolean');
  });

  test('env editor: vars without a declared dataType show the default string label', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, collectionName);
    await selectEnvironment(page, 'variables', 'collection');
    await selectEnvironment(page, 'variables', 'global');

    // Numeric / boolean / object-looking values with no declared dataType are
    // never inferred as typed — the selector shows the default 'string'. An
    // untyped secret likewise never gains an inferred dataType.
    await openEnvironmentSettings(page, 'collection');
    await expectEnvVarTypeLabel(page, 'env_untyped_num', 'string');
    await expectEnvVarTypeLabel(page, 'env_untyped_bool', 'string');
    await expectEnvVarTypeLabel(page, 'env_untyped_obj', 'string');
    await expectEnvVarTypeLabel(page, 'env_secret_untyped', 'string', { secret: true });

    await openEnvironmentSettings(page, 'global');
    await expectEnvVarTypeLabel(page, 'glob_untyped_num', 'string');
    await expectEnvVarTypeLabel(page, 'glob_untyped_bool', 'string');
    await expectEnvVarTypeLabel(page, 'glob_untyped_obj', 'string');
    await expectEnvVarTypeLabel(page, 'glob_secret_untyped', 'string', { secret: true });
  });

  test('env editor: secret variables display their declared dataType label', async ({ pageWithUserData: page }) => {
    await runSecretDataTypeLabelAssertions(page, collectionName);
  });

  test('hover popup: body variables show parsed values for each dataType after execution', async ({ pageWithUserData: page }) => {
    await runBodyHoverPopupAssertions(page, collectionName);
  });

  test('hover popup: clicking to edit seeds the editor with the right text for every dataType', async ({ pageWithUserData: page }) => {
    await runBodyEditorSeedAssertions(page, collectionName);
  });

  test('save: dataType change round-trips to disk, then execution honors the new dataType', async ({
    restartApp,
    workspaceFixturePath
  }, testInfo) => {
    // restartApp boots a fresh electron (~10s) AND we send a real network request
    // after save, which combined exceeds the default 30s timeout.
    testInfo.setTimeout(90_000);

    // restartApp gives this test an isolated electron app pointed at its own
    // workspaceFixturePath (the shared app binds to the first test's tmp workspace).
    expect(workspaceFixturePath).not.toBeNull();
    const requestFile = path.join(workspaceFixturePath!, ...savedRequestFile);

    const app = await restartApp({});
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await openRequestInCollection(page, collectionName);
    await selectEnvironment(page, 'variables', 'collection');
    await selectEnvironment(page, 'variables', 'global');
    await selectRequestPaneTab(page, 'Vars');

    // Step 1: change req_str's dataType in the UI (puts the request in draft state).
    const row = tableRowByName(buildCommonLocators(page).table('request-vars-req'), 'req_str');
    await expectTypeLabel(row, 'string');
    await changeRowDataType(page, row, 'number');
    await expect(buildCommonLocators(page).tabs.draftIndicator()).toBeVisible();

    // Step 2: save — the number dataType round-trips to disk in the fixture's format.
    await saveRequest(page);
    await expect(buildCommonLocators(page).tabs.draftIndicator()).not.toBeVisible();
    await expectTypeLabel(row, 'number');
    await expect.poll(
      async () => fs.promises.readFile(requestFile, 'utf8'),
      { timeout: 5000 }
    ).toMatch(savedDataTypeMatcher);

    // Step 3: execute. The runner reads the saved fixture, sees req_str is now a
    // number, and applies datatype-driven coercion. Envs are already activated.
    await sendAndAssertAllTestsPass(page);
  });
};

test.describe('DataType selector — BRU collection fixture', () => {
  runDataTypeSelectorTests(BRU_COLLECTION, {
    savedRequestFile: ['collections', 'bru', 'folder', 'request.bru'],
    // bare `@number` annotation above the var
    savedDataTypeMatcher: /@number\n {2}req_str: request_string/
  });
});

test.describe('DataType selector — YML collection fixture', () => {
  runDataTypeSelectorTests(YML_COLLECTION, {
    savedRequestFile: ['collections', 'yml', 'folder', 'request.yml'],
    // value becomes a { type, data } object
    savedDataTypeMatcher: /- name: req_str\n\s+value:\n\s+type: number\n\s+data: ['"]?request_string['"]?/
  });
});
