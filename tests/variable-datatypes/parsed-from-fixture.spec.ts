import fs from 'fs';
import path from 'path';
import { test, expect, Page, Locator } from '../../playwright';
import {
  selectEnvironment,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequestAndWaitForResponse
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

/**
 * These tests cover the DatatypeSelector on the surfaces where it remains
 * after scoping the feature down: request vars, collection environment
 * vars, and global environment vars. Query params, path params, headers,
 * and form-data fields no longer expose datatype, so they are not asserted
 * here.
 *
 * Fixtures under `fixtures/workspace/collections/{bru,yml}` declare a single
 * request whose vars block carries one row per supported datatype (string,
 * number, boolean, object). Each describe block ends with a save test that
 * mutates one row's datatype via the selector and asserts the change
 * round-trips through the serializer to the on-disk file.
 */

const BRU_COLLECTION = 'datatypes-bru';
const YML_COLLECTION = 'datatypes-yml';

type VarScope = 'request' | 'folder' | 'collection';

/**
 * Datatype expectations for each variable scope. Every scope declares one
 * row per supported datatype (string, number, boolean, object). The test
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

const clickSaveRequest = async (page: Page) => {
  await page.locator('#request-actions').getByTitle('Save Request').click();
  await expect(page.getByText('Request saved successfully').last()).toBeVisible({ timeout: 5000 });
};

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

  const collectionSlug = collectionName.replace(/\s+/g, '-').toLowerCase();
  const collectionScope = page.locator(`#collection-${collectionSlug}`);

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
  table.container().locator(`tbody tr[data-row-name="${name}"]`);

const expectTypeLabel = async (row: Locator, label: string) => {
  await expect(row.locator('.type-label').first()).toHaveText(label);
};

/**
 * Open the DatatypeSelector for a row and pick a new type. The picker is a
 * MenuDropdown rendered via Tippy at the page scope, so the menu items
 * surface outside the row.
 */
const changeRowDatatype = async (page: Page, row: Locator, newType: string) => {
  const trigger = row.locator('.type-label').first();
  await trigger.click();

  const menuItem = page.locator('[role="menu"]').last().getByText(newType, { exact: true });
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

  const collectionSlug = collectionName.replace(/\s+/g, '-').toLowerCase();
  const collectionScope = page.locator(`#collection-${collectionSlug}`);
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
 * verify each row's `.type-label` matches the declared datatype.
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
 * The fixture posts to httpbin.org, so this requires network. We key off the
 * test summary line ("Tests (N), Passed: X, Failed: Y") since each datatype
 * check renders as a separate test row.
 */
const sendAndAssertAllTestsPass = async (page: Page) => {
  await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
  await selectResponsePaneTab(page, 'Tests');

  const summary = page.locator('.test-summary').filter({ hasText: 'Tests' });
  await expect(summary).toContainText(`Tests (${EXPECTED_TEST_COUNT}), Passed: ${EXPECTED_TEST_COUNT}, Failed: 0`);

  // Catch any individual failure even if the summary text changes.
  await expect(page.locator('.test-result-item .test-failure')).toHaveCount(0);
};

/**
 * Convenience wrapper: activate the collection + global envs, then send and
 * verify all tests pass. Used by tests that own the env-selection step.
 */
const runAndAssertTestsPass = async (page: Page) => {
  await selectEnvironment(page, 'test_env', 'collection');
  await selectEnvironment(page, 'typed_global', 'global');
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
  await page.getByTestId('configure-env').click();
  const tabTitle = type === 'collection' ? 'Environments' : 'Global Environments';
  await expect(locators.tabs.activeRequestTab()).toContainText(tabTitle);
};

/** Assert the DatatypeSelector inside an env-var row reports the expected label. */
const expectEnvVarTypeLabel = async (page: Page, name: string, label: string) => {
  const row = page.locator(`[data-testid="env-var-row-${name}"]`);
  await expect(row.locator('.type-label').first()).toHaveText(label);
};

// Scroll the virtualized env table to its bottom so trailing rows mount.
const scrollEnvTableToBottom = async (page: Page) => {
  await page.locator('.table-container').first().evaluate((el: HTMLElement) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(150);
};

/**
 * The DatatypeSelector renders a yellow `IconAlertCircle` whenever the
 * variable's value can't be coerced to the declared datatype (e.g.
 * datatype=number with value="not-a-number"). The icon's distinguishing
 * class is `text-yellow-600`, applied to the SVG itself.
 */
const mismatchIcon = (row: Locator) => row.locator('svg.text-yellow-600');

test.afterEach(async ({ pageWithUserData: page }) => {
  await closeAllTabs(page);
});

test.describe('Datatype selector — BRU collection fixture', () => {
  test('vars: all datatypes render correctly across collection / folder / request scopes', async ({ pageWithUserData: page }) => {
    await expectAllVarLabels(page, BRU_COLLECTION);
  });

  test('request vars: query params and headers do NOT expose the datatype selector', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, BRU_COLLECTION);
    await selectRequestPaneTab(page, 'Params');
    const queryTable = buildCommonLocators(page).table('query-params');
    await expect(queryTable.container().locator('.type-label')).toHaveCount(0);

    await selectRequestPaneTab(page, 'Headers');
    const headersTable = buildCommonLocators(page).table('request-headers');
    await expect(headersTable.container().locator('.type-label')).toHaveCount(0);
  });

  test('test script: every typed var across scopes asserts true', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, BRU_COLLECTION);
    await runAndAssertTestsPass(page);
  });

  test('multipart form: typed pre-request vars stringify on the wire', async ({ pageWithUserData: page }) => {
    // The form-data path runs in bruno-electron regardless of source format,
    // so we exercise it once via the BRU multipart fixture. Asserts the
    // toFormValue stringifier in packages/bruno-electron/src/utils/form-data.js
    // is converting typed (number/boolean/object) values to strings before
    // form.append.
    await openRequestInCollection(page, BRU_COLLECTION, 'multipart');
    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
    await selectResponsePaneTab(page, 'Tests');
    await expect(
      page.locator('.test-summary').filter({ hasText: 'Tests' })
    ).toContainText('Tests (1), Passed: 1, Failed: 0');
    await expect(page.locator('.test-result-item .test-failure')).toHaveCount(0);
  });

  test('form-urlencoded: typed pre-request vars stringify on the wire', async ({ pageWithUserData: page }) => {
    // form-urlencoded uses a separate code path from multipart:
    // buildFormUrlEncodedPayload in @usebruno/common coerces values via String().
    // Verifies typed (number/boolean/object) vars round-trip into the
    // application/x-www-form-urlencoded body and httpbin echoes the wire form.
    await openRequestInCollection(page, BRU_COLLECTION, 'form_urlencoded');
    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
    await selectResponsePaneTab(page, 'Tests');
    await expect(
      page.locator('.test-summary').filter({ hasText: 'Tests' })
    ).toContainText('Tests (1), Passed: 1, Failed: 0');
    await expect(page.locator('.test-result-item .test-failure')).toHaveCount(0);
  });

  test('vars: warning icon shows when value does not match the declared datatype', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, BRU_COLLECTION);
    await selectRequestPaneTab(page, 'Vars');

    const table = buildCommonLocators(page).table('request-vars-req');

    // mismatched_num declares @number but the value is "not-a-number" — coercion
    // fails, value falls back to the raw string, the row should warn.
    const mismatchedRow = tableRowByName(table, 'mismatched_num');
    await expectTypeLabel(mismatchedRow, 'number');
    await expect(mismatchIcon(mismatchedRow)).toBeVisible();

    // Sanity check: req_num declares @number with value 42 — no warning.
    const matchingRow = tableRowByName(table, 'req_num');
    await expectTypeLabel(matchingRow, 'number');
    await expect(mismatchIcon(matchingRow)).toHaveCount(0);

    // Sanity check: a row whose datatype defaults to string (req_str) — no warning.
    const stringRow = tableRowByName(table, 'req_str');
    await expectTypeLabel(stringRow, 'string');
    await expect(mismatchIcon(stringRow)).toHaveCount(0);
  });

  test('script setEnvVar / setGlobalEnvVar: inferred datatype renders in the env editor', async ({
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

    await openRequestInCollection(page, BRU_COLLECTION);
    await selectEnvironment(page, 'test_env', 'collection');
    await selectEnvironment(page, 'typed_global', 'global');

    // Pre-request script seeds inferred_env_* and inferred_glob_* via
    // bru.setEnvVar / bru.setGlobalEnvVar. After send, the env stores those
    // vars with the inferred datatype attached.
    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });

    // The 200 status arrives before post-response IPC ('main:script-environment-update'
    // and 'main:global-environment-variables-update') has propagated to redux.
    // Wait for the Tests panel to populate — that guarantees the runner has
    // finished post-response work and the env state is in sync.
    await selectResponsePaneTab(page, 'Tests');
    await expect(
      page.locator('.test-summary').filter({ hasText: 'Tests' })
    ).toContainText(`Tests (${EXPECTED_TEST_COUNT}), Passed: ${EXPECTED_TEST_COUNT}`);

    await openEnvironmentSettings(page, 'collection');
    await expectEnvVarTypeLabel(page, 'inferred_env_num', 'number');
    await expectEnvVarTypeLabel(page, 'inferred_env_bool', 'boolean');
    await expectEnvVarTypeLabel(page, 'inferred_env_obj', 'object');
    // strict_* rows sit past the virtualizer's initial render window — scroll
    // the table to its bottom so they mount before the assertions.
    await scrollEnvTableToBottom(page);
    // getDatatypeFromValue is strict — string content doesn't promote.
    await expectEnvVarTypeLabel(page, 'strict_num_str', 'string');
    await expectEnvVarTypeLabel(page, 'strict_bool_str', 'string');
    await expectEnvVarTypeLabel(page, 'strict_obj_str', 'string');

    await openEnvironmentSettings(page, 'global');
    await expectEnvVarTypeLabel(page, 'inferred_glob_num', 'number');
    await expectEnvVarTypeLabel(page, 'inferred_glob_bool', 'boolean');
    await expectEnvVarTypeLabel(page, 'inferred_glob_obj', 'object');
    await expectEnvVarTypeLabel(page, 'strict_glob_num_str', 'string');
  });

  test('env editor: typed falsy values (0, false) display their datatype label', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, BRU_COLLECTION);
    await selectEnvironment(page, 'test_env', 'collection');
    await openEnvironmentSettings(page, 'collection');

    await expectEnvVarTypeLabel(page, 'falsy_num', 'number');
    await expectEnvVarTypeLabel(page, 'falsy_bool', 'boolean');

    await expectEnvVarTypeLabel(page, 'env_num', 'number');
    await expectEnvVarTypeLabel(page, 'env_bool', 'boolean');
  });

  test('save: datatype change round-trips to request.bru, then execution honors the new datatype', async ({
    restartApp,
    workspaceFixturePath
  }, testInfo) => {
    // restartApp boots a fresh electron (~10s) AND we send a real httpbin
    // request after save, which combined exceeds the default 30s test
    // timeout. Bump it for this heavier flow.
    testInfo.setTimeout(90_000);

    // Use `restartApp` so this test gets an isolated electron app pointed at
    // its own `workspaceFixturePath`. Without this, the app reused across
    // tests binds to the FIRST test's tmp workspace.
    expect(workspaceFixturePath).not.toBeNull();
    const requestFile = path.join(workspaceFixturePath!, 'collections', 'bru', 'folder', 'request.bru');

    const app = await restartApp({});
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await openRequestInCollection(page, BRU_COLLECTION);
    await selectEnvironment(page, 'test_env', 'collection');
    await selectEnvironment(page, 'typed_global', 'global');
    await selectRequestPaneTab(page, 'Vars');

    // Step 1: update the datatype in the UI (puts request in draft state).
    const row = tableRowByName(buildCommonLocators(page).table('request-vars-req'), 'req_str');
    await expectTypeLabel(row, 'string');
    await changeRowDatatype(page, row, 'number');
    await expect(page.locator('.request-tab.active .has-changes-icon')).toBeVisible();

    // Step 2: save — round-trips a bare `@number` annotation to disk.
    await clickSaveRequest(page);
    await expect(page.locator('.request-tab.active .has-changes-icon')).not.toBeVisible();
    await expectTypeLabel(row, 'number');
    await expect.poll(
      async () => fs.promises.readFile(requestFile, 'utf8'),
      { timeout: 5000 }
    ).toMatch(/@number\n {2}req_str: request_string/);

    // Step 3: execute. The runner reads the saved fixture, sees @number on
    // req_str, and applies datatype-driven coercion when building
    // requestVariables. Envs are already activated above, so we skip the
    // re-selection inside runAndAssertTestsPass and just send + verify.
    await sendAndAssertAllTestsPass(page);
  });
});

test.describe('Datatype selector — YML collection fixture', () => {
  test('vars: all datatypes render correctly across collection / folder / request scopes', async ({ pageWithUserData: page }) => {
    await expectAllVarLabels(page, YML_COLLECTION);
  });

  test('test script: every typed var across scopes asserts true', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, YML_COLLECTION);
    await runAndAssertTestsPass(page);
  });

  test('vars: warning icon shows when value does not match the declared datatype', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, YML_COLLECTION);
    await selectRequestPaneTab(page, 'Vars');

    const table = buildCommonLocators(page).table('request-vars-req');

    // mismatched_num: { type: number, data: "not-a-number" } — falls back to the raw
    // string after fromOpenCollectionTypedValue() can't coerce to a number.
    const mismatchedRow = tableRowByName(table, 'mismatched_num');
    await expectTypeLabel(mismatchedRow, 'number');
    await expect(mismatchIcon(mismatchedRow)).toBeVisible();

    const matchingRow = tableRowByName(table, 'req_num');
    await expectTypeLabel(matchingRow, 'number');
    await expect(mismatchIcon(matchingRow)).toHaveCount(0);

    const stringRow = tableRowByName(table, 'req_str');
    await expectTypeLabel(stringRow, 'string');
    await expect(mismatchIcon(stringRow)).toHaveCount(0);
  });

  test('env editor: typed falsy values (0, false) display their datatype label', async ({ pageWithUserData: page }) => {
    await openRequestInCollection(page, YML_COLLECTION);
    await selectEnvironment(page, 'test_env', 'collection');
    await openEnvironmentSettings(page, 'collection');

    await expectEnvVarTypeLabel(page, 'falsy_num', 'number');
    await expectEnvVarTypeLabel(page, 'falsy_bool', 'boolean');
  });

  test('save: datatype change round-trips to request.yml, then execution honors the new datatype', async ({
    restartApp,
    workspaceFixturePath
  }, testInfo) => {
    testInfo.setTimeout(90_000);

    expect(workspaceFixturePath).not.toBeNull();
    const requestFile = path.join(workspaceFixturePath!, 'collections', 'yml', 'folder', 'request.yml');

    const app = await restartApp({});
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await openRequestInCollection(page, YML_COLLECTION);
    await selectEnvironment(page, 'test_env', 'collection');
    await selectEnvironment(page, 'typed_global', 'global');
    await selectRequestPaneTab(page, 'Vars');

    // Step 1: update the datatype in the UI (puts request in draft state).
    const row = tableRowByName(buildCommonLocators(page).table('request-vars-req'), 'req_str');
    await expectTypeLabel(row, 'string');
    await changeRowDatatype(page, row, 'number');
    await expect(page.locator('.request-tab.active .has-changes-icon')).toBeVisible();

    // Step 2: save — value becomes an object with type/data on disk.
    await clickSaveRequest(page);
    await expect(page.locator('.request-tab.active .has-changes-icon')).not.toBeVisible();
    await expectTypeLabel(row, 'number');
    await expect.poll(
      async () => fs.promises.readFile(requestFile, 'utf8'),
      { timeout: 5000 }
    ).toMatch(/- name: req_str\n\s+value:\n\s+type: number\n\s+data: ['"]?request_string['"]?/);

    // Step 3: execute. Envs are already activated above; skip re-selection
    // and just send + verify the test summary in the response pane.
    await sendAndAssertAllTestsPass(page);
  });
});
