import { Page, test } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, expectLinkOpensRequest, expectNoLink, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, openCollectionFromDialog, openRequest, selectRequestPaneTab } from '../../utils/page';

const pane = (page: Page) => page.locator('[data-testid="request-pane"]');
const url = (path: string) => `http://link-aware.test/${path}`;

test.describe('CodeMirror link-aware — WebSocket request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'ws-request');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  // TC-057/058: linkify-it doesn't recognize the ws:/wss: scheme, so a WS request's
  // own URL is never marked clickable — this is expected, not a gap.
  test('TC-057/058 URL Bar: a ws:// URL is not treated as a link', async ({ page }) => {
    await expectNoLink(page.locator('.input-container .CodeMirror').first());
  });

  test('TC-059 Messages: plain click opens a transient WS request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Message');
    const cm = buildCommonLocators(page).codeMirror.within(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'ws', url: url('ws-body') });
  });

  test('TC-065 Docs: plain click opens a transient WS request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle(pane(page)).click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(pane(page)), { type: 'ws', url: url('ws-docs') });
  });
});
