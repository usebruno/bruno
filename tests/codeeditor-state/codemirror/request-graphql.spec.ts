import { Page, test } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, expectLinkOpensRequest, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, openCollectionFromDialog, openRequest, selectRequestPaneTab, selectScriptSubTab } from '../../utils/page';

const pane = (page: Page) => page.locator('[data-testid="request-pane"]');
const url = (path: string) => `http://link-aware.test/${path}`;

const openVariablesPanel = async (page: Page) => {
  await page.getByText('Variables', { exact: true }).click();
};

test.describe('CodeMirror link-aware — GraphQL request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'graphql-request');
    await selectRequestPaneTab(page, 'Query');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-027 URL Bar: plain click opens a transient GraphQL request', async ({ page }) => {
    const cm = buildCommonLocators(page).request.urlInput();
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-url') });
  });

  test('TC-029 Query editor: plain click opens a transient GraphQL request', async ({ page }) => {
    const cm = buildCommonLocators(page).codeMirror.within(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-query') });
  });

  test('TC-031 Variables: plain click opens a transient GraphQL request', async ({ page }) => {
    await openVariablesPanel(page);
    const cm = pane(page).locator('.CodeMirror').last();
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-variables') });
  });

  test('TC-037 Vars: plain click opens a transient GraphQL request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-vars') });
  });

  test('TC-039 Pre-Request-Script: plain click opens a transient GraphQL request', async ({ page }) => {
    await selectScriptSubTab(page, 'pre-request');
    const cm = buildCommonLocators(page).codeMirror.byTestId('pre-request-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-script') });
  });

  test('TC-039 Post-Response-Script: plain click opens a transient GraphQL request', async ({ page }) => {
    await selectScriptSubTab(page, 'post-response');
    const cm = buildCommonLocators(page).codeMirror.byTestId('post-response-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-script') });
  });

  test('TC-043 Tests: plain click opens a transient GraphQL request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Tests');
    const cm = buildCommonLocators(page).codeMirror.byTestId('test-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-tests') });
  });

  test('TC-045 Docs: plain click opens a transient GraphQL request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle(pane(page)).click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(pane(page)), { type: 'graphql', url: url('graphql-docs') });
  });
});
