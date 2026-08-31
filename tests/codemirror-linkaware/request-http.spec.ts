import { expect, Page, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, expectLinkOpensExternally, expectLinkOpensRequest, expectNoLink, expectRichTextLinkOpensExternally, expectRichTextLinkOpensRequest, LINK_CLICK_MODIFIER, openCollectionFromDialog, openRequest, selectRequestPaneTab, selectScriptSubTab, setCodeMirrorValue as setCmValue } from '../utils/page';

const pane = (page: Page) => buildCommonLocators(page).request.pane();
const url = (path: string) => `http://link-aware.test/${path}`;
const varsCm = (page: Page) => buildCommonLocators(page).codeMirror.valueCellAt(pane(page));

test.describe('CodeMirror link-aware - HTTP request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'http-request');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('URL Bar: plain click does not open a request; Cmd/Ctrl+Click opens it externally', async ({ page }) => {
    const cm = buildCommonLocators(page).request.urlInput();
    const link = cm.locator('.CodeMirror-link').first();
    await expect(link).toBeVisible();

    await link.click();
    await expect(cm).toContainClass('CodeMirror-focused');

    await expectLinkOpensExternally(page, cm);
  });

  test('Params: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Params');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-params') });
  });

  test('Body: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Body');
    const cm = buildCommonLocators(page).request.bodyEditor().locator('.CodeMirror');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-body') });
  });

  test('Vars: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Vars');
    await expectLinkOpensRequest(page, varsCm(page), { type: 'http', url: url('http-vars') });
  });

  test('Pre-Request-Script: plain click opens a transient HTTP request', async ({ page }) => {
    await selectScriptSubTab(page, 'pre-request');
    const cm = buildCommonLocators(page).codeMirror.byTestId('pre-request-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-script') });
  });

  test('Post-Response-Script: plain click opens a transient HTTP request', async ({ page }) => {
    await selectScriptSubTab(page, 'post-response');
    const cm = buildCommonLocators(page).codeMirror.byTestId('post-response-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-script') });
  });

  test('Tests: plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Tests');
    const cm = buildCommonLocators(page).codeMirror.byTestId('test-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('http-tests') });
  });

  test('Docs (Markdown mode): plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle().click();
    await locators.docs.modeSwitchMarkdown().click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(pane(page)), { type: 'http', url: url('http-docs') });
  });

  test('Docs (Markdown mode): Cmd/Ctrl+Click opens the link externally', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle().click();
    await locators.docs.modeSwitchMarkdown().click();
    await expectLinkOpensExternally(page, locators.codeMirror.within(pane(page)));
  });

  test('Docs (Rich Text mode): plain click opens a transient HTTP request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('http-docs')}"]`);
    await expectRichTextLinkOpensRequest(page, link, { type: 'http', url: url('http-docs') });
  });

  test('Docs (Rich Text mode): Cmd/Ctrl+Click opens the link externally', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('http-docs')}"]`);
    await expectRichTextLinkOpensExternally(page, link, [LINK_CLICK_MODIFIER]);
  });

  test('Vars: repeated clicks generate unique "Untitled N" names', async ({ page }) => {
    await selectRequestPaneTab(page, 'Vars');
    await expectLinkOpensRequest(page, varsCm(page), { type: 'http', url: url('http-vars') });
    const firstName = await page.locator('.request-tab.active .tab-name').innerText();

    await openRequest(page, COLLECTION_NAME, 'http-request');
    await selectRequestPaneTab(page, 'Vars');
    await expectLinkOpensRequest(page, varsCm(page), { type: 'http', url: url('http-vars') });
    const secondName = await page.locator('.request-tab.active .tab-name').innerText();

    expect(secondName).not.toBe(firstName);
  });

  test('Params: {{variable}}-interpolated URL is not treated as a link', async ({ page }) => {
    await selectRequestPaneTab(page, 'Params');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(pane(page), 1); // second (auto-added empty) params row
    await setCmValue(cm, url('{{shouldNotLink}}'));
    await expectNoLink(cm);
  });

  test('Vars: transient request opens as a new tab in the same collection', async ({ page }) => {
    await openRequest(page, COLLECTION_NAME, 'http-request', { persist: true });

    await selectRequestPaneTab(page, 'Vars');
    await expectLinkOpensRequest(page, varsCm(page), { type: 'http', url: url('http-vars') });
    await expect(page.locator('.request-tab')).toHaveCount(2);
  });
});
