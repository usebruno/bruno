import { Page, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, expectLinkOpensExternally, expectLinkOpensRequest, expectNoLink, expectRichTextLinkOpensExternally, expectRichTextLinkOpensRequest, LINK_CLICK_MODIFIER, openCollectionFromDialog, openRequest, selectRequestPaneTab } from '../utils/page';

const pane = (page: Page) => buildCommonLocators(page).request.pane();
const url = (path: string) => `http://link-aware.test/${path}`;

test.describe('CodeMirror link-aware - WebSocket request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'ws-request');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('URL Bar: a ws:// URL is not treated as a link', async ({ page }) => {
    await expectNoLink(page.locator('.input-container .CodeMirror').first());
  });

  test('Messages: plain click opens a transient WS request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Message');
    const cm = buildCommonLocators(page).codeMirror.within(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'ws', url: url('ws-body') });
  });

  test('Docs (Markdown mode): plain click opens a transient WS request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle().click();
    await locators.docs.modeSwitchMarkdown().click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(pane(page)), { type: 'ws', url: url('ws-docs') });
  });

  test('Docs (Markdown mode): Cmd/Ctrl+Click opens the link externally', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle().click();
    await locators.docs.modeSwitchMarkdown().click();
    await expectLinkOpensExternally(page, locators.codeMirror.within(pane(page)));
  });

  test('Docs (Rich Text mode): plain click opens a transient WS request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('ws-docs')}"]`);
    await expectRichTextLinkOpensRequest(page, link, { type: 'ws', url: url('ws-docs') });
  });

  test('Docs (Rich Text mode): Cmd/Ctrl+Click opens the link externally', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('ws-docs')}"]`);
    await expectRichTextLinkOpensExternally(page, link, [LINK_CLICK_MODIFIER]);
  });
});
