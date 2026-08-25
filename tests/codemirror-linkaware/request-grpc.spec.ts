import { expect, Page, test } from '../../playwright';
import { buildCommonLocators, buildGrpcCommonLocators, closeAllCollections, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, expectLinkOpensExternally, expectLinkOpensRequest, openCollectionFromDialog, openRequest, selectRequestPaneTab } from '../utils/page';

const pane = (page: Page) => page.locator('[data-testid="request-pane"]');
const url = (path: string) => `http://link-aware.test/${path}`;

test.describe('CodeMirror link-aware - gRPC request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'grpc-request');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('URL Bar: plain click does not open a request; Cmd/Ctrl+Click opens it externally', async ({ page }) => {
    const cm = buildGrpcCommonLocators(page).request.queryUrlContainer().locator('.CodeMirror');
    const link = cm.locator('.CodeMirror-link').first();
    await expect(link).toBeVisible();

    await link.click();
    await expect(cm).toContainClass('CodeMirror-focused');

    await expectLinkOpensExternally(page, cm);
  });

  test('Body / Messages: plain click opens a transient gRPC request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Message');
    const cm = buildGrpcCommonLocators(page).request.messagesContainer().locator('.CodeMirror').first();
    await expectLinkOpensRequest(page, cm, { type: 'grpc', url: url('grpc-body') });
  });

  test('Docs: plain click opens a transient gRPC request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle(pane(page)).click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(pane(page)), { type: 'grpc', url: url('grpc-docs') });
  });
});
