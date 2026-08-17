import { expect, Page, test } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, expectLinkOpensRequest, expectNoLink, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, openCollectionFromDialog, openRequest, selectRequestPaneTab, selectScriptSubTab, setCodeMirrorValue as setCmValue } from '../../utils/page';

const pane = (page: Page) => page.locator('[data-testid="request-pane"]');
const url = (path: string) => `http://link-aware.test/${path}`;
const HTTP_REQUEST_URL = 'https://testbench-sanity.usebruno.com/api/echo/json';

test.describe('CodeMirror link-aware — HTTP request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'http-request');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-001 URL Bar: plain click opens a transient HTTP request', async ({ page }) => {
    const cm = buildCommonLocators(page).request.urlInput();
    await expectLinkOpensRequest(page, cm, { type: 'http', url: HTTP_REQUEST_URL });
  });

  test('TC-005 Params: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Params');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-params') });
  });

  test('TC-007 Body: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Body');
    const cm = buildCommonLocators(page).request.bodyEditor().locator('.CodeMirror');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-body') });
  });

  test('TC-017 Vars: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-vars') });
  });

  test('TC-019 Pre-Request-Script: plain click opens a transient HTTP request', async ({ page }) => {
    await selectScriptSubTab(page, 'pre-request');
    const cm = buildCommonLocators(page).codeMirror.byTestId('pre-request-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-script') });
  });

  test('TC-019 Post-Response-Script: plain click opens a transient HTTP request', async ({ page }) => {
    await selectScriptSubTab(page, 'post-response');
    const cm = buildCommonLocators(page).codeMirror.byTestId('post-response-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-script') });
  });

  test('TC-023 Tests: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Tests');
    const cm = buildCommonLocators(page).codeMirror.byTestId('test-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-tests') });
  });

  test('TC-025 Docs: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle(pane(page)).click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(pane(page)), { type: 'http', url: url('http-docs') });
  });

  test('TC-067 URL Bar: repeated clicks generate unique "Untitled N" names', async ({ page }) => {
    const urlInput = buildCommonLocators(page).request.urlInput();
    await expectLinkOpensRequest(page, urlInput, { type: 'http', url: HTTP_REQUEST_URL });
    const firstName = await page.locator('.request-tab.active .tab-name').innerText();

    await openRequest(page, COLLECTION_NAME, 'http-request');
    await expectLinkOpensRequest(page, buildCommonLocators(page).request.urlInput(), { type: 'http', url: HTTP_REQUEST_URL });
    const secondName = await page.locator('.request-tab.active .tab-name').innerText();

    expect(secondName).not.toBe(firstName);
  });

  test('TC-068 Params: {{variable}}-interpolated URL is not treated as a link', async ({ page }) => {
    await selectRequestPaneTab(page, 'Params');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(pane(page), 1); // second (auto-added empty) params row
    await setCmValue(cm, url('{{shouldNotLink}}'));
    await expectNoLink(cm);
  });

  test('TC-069 URL Bar: transient request opens as a new tab in the same collection', async ({ page }) => {
    // beforeEach opens http-request as a preview tab (single click) — Bruno replaces the
    // last preview tab when a new one opens in the same collection (VS Code-style), so pin
    // it first via double-click, otherwise the new transient request would just replace it
    // instead of adding a second tab.
    await openRequest(page, COLLECTION_NAME, 'http-request', { persist: true });

    const cm = buildCommonLocators(page).request.urlInput();
    await expectLinkOpensRequest(page, cm, { type: 'http', url: HTTP_REQUEST_URL });
    await expect(page.locator('.request-tab')).toHaveCount(2);
  });
});
