import { test, Page } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createEnvironment,
  addEnvironmentVariables,
  saveEnvironment,
  createRequest,
  openRequest,
  selectAuthMode,
  selectRequestBodyMode,
  selectRequestPaneTab,
  selectScriptSubTab,
  buildCommonLocators
} from '../utils/page';
import { buildRequestLocators } from '../utils/request';
import {
  expectSingleBraceOpensAutocomplete,
  expectSingleBraceDoesNotOpenAutocomplete
} from '../utils/page/autocomplete';

const authFieldEditor = (page: Page, labelText: string) =>
  buildRequestLocators(page)
    .pane()
    .locator('label')
    .filter({ hasText: new RegExp(`^${labelText}$`) })
    .locator('..')
    .locator('.single-line-editor-wrapper .CodeMirror')
    .first();

test.describe('single `{` trigger surfaces', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('opens on the URL bar, query/path params, headers, and auth fields', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'autocomplete-trigger-positive';
    const requestName = 'trigger-request';

    await createCollection(page, collectionName, await createTmpDir());
    await createRequest(page, requestName, collectionName, {
      url: 'https://example.com/api/users/:userId?search='
    });
    await openRequest(page, collectionName, requestName);

    const { table } = buildCommonLocators(page);
    const request = buildRequestLocators(page);

    await test.step('URL bar', async () => {
      await expectSingleBraceOpensAutocomplete(page, request.urlInput());
      await page.keyboard.press('Escape');
    });

    await test.step('Query param value', async () => {
      await selectRequestPaneTab(page, 'Params');
      const row = table('query-params-table').row(0);
      const valueEditor = table('query-params-table').rowValueEditor(row);
      await expectSingleBraceOpensAutocomplete(page, valueEditor);
      await page.keyboard.press('Escape');
    });

    await test.step('Path param value', async () => {
      const row = table('path-params-table').row(0);
      const valueEditor = table('path-params-table').rowValueEditor(row);
      await expectSingleBraceOpensAutocomplete(page, valueEditor);
      await page.keyboard.press('Escape');
    });

    await test.step('Header value', async () => {
      await selectRequestPaneTab(page, 'Headers');

      const row = table('request-headers-table').row(0);
      const valueEditor = table('request-headers-table').rowValueEditor(row);
      await expectSingleBraceOpensAutocomplete(page, valueEditor);
      await page.keyboard.press('Escape');
    });

    await test.step('Basic Auth — Username', async () => {
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, 'Basic Auth');
      await expectSingleBraceOpensAutocomplete(page, authFieldEditor(page, 'Username'));
      await page.keyboard.press('Escape');
    });

    await test.step('Bearer Auth — Token', async () => {
      await selectAuthMode(page, 'Bearer Token');
      await expectSingleBraceOpensAutocomplete(page, authFieldEditor(page, 'Token'));
      await page.keyboard.press('Escape');
    });

    await test.step('AWS Sig v4 — Secret Access Key (also a masked field)', async () => {
      await selectAuthMode(page, 'AWS Sig v4');
      await expectSingleBraceOpensAutocomplete(page, authFieldEditor(page, 'Secret Access Key'));
      await page.keyboard.press('Escape');
    });
  });

  test('does not open in code editors, Vars/Assert tables, form params, or environment values', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'autocomplete-trigger-negative';
    const requestName = 'no-trigger-request';

    await createCollection(page, collectionName, await createTmpDir());
    await createRequest(page, requestName, collectionName, {
      url: 'https://example.com/api',
      method: 'POST'
    });
    await openRequest(page, collectionName, requestName);

    const { table } = buildCommonLocators(page);
    const request = buildRequestLocators(page);

    await test.step('Request body (JSON code editor)', async () => {
      await selectRequestBodyMode(page, 'JSON');
      const editor = request.bodyEditor().locator('.CodeMirror').first();
      await expectSingleBraceDoesNotOpenAutocomplete(page, editor);
    });

    await test.step('Pre-request script (code editor)', async () => {
      await selectRequestPaneTab(page, 'Script');

      await selectScriptSubTab(page, 'pre-request');
      const editor = page.getByTestId('pre-request-script-editor').locator('.CodeMirror').first();
      await expectSingleBraceDoesNotOpenAutocomplete(page, editor);
    });

    await test.step('Pre Request Vars — value', async () => {
      await selectRequestPaneTab(page, 'Vars');
      const row = table('request-vars-req').row(0);
      const valueEditor = table('request-vars-req').rowValueEditor(row);
      await expectSingleBraceDoesNotOpenAutocomplete(page, valueEditor);
    });

    await test.step('Assert — value', async () => {
      await selectRequestPaneTab(page, 'Assert');
      const row = table('assertions-table').row(0);
      const valueEditor = table('assertions-table').rowValueEditor(row);
      await expectSingleBraceDoesNotOpenAutocomplete(page, valueEditor);
    });

    await test.step('Form URL Encoded param — value', async () => {
      await selectRequestBodyMode(page, 'Form URL Encoded');
      const row = table('form-urlencoded-table').row(0);
      const valueEditor = table('form-urlencoded-table').rowValueEditor(row);
      await expectSingleBraceDoesNotOpenAutocomplete(page, valueEditor);
    });

    await test.step('Environment variable — value', async () => {
      await createEnvironment(page, 'trigger-test-env', 'collection');
      await addEnvironmentVariables(page, [{ name: 'envVar', value: '' }]);
      await saveEnvironment(page);
      const valueEditor = buildCommonLocators(page).environment.varRowValueEditor('envVar');
      await expectSingleBraceDoesNotOpenAutocomplete(page, valueEditor);
    });
  });
});
