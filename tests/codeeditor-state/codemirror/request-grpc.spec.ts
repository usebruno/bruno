import { Page, test } from '../../../playwright';
import { buildCommonLocators, buildGrpcCommonLocators, closeAllCollections, expectLinkOpensRequest, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, openCollectionFromDialog, openRequest, selectRequestPaneTab } from '../../utils/page';

const pane = (page: Page) => page.locator('[data-testid="request-pane"]');
const url = (path: string) => `http://link-aware.test/${path}`;

test.describe('CodeMirror link-aware — gRPC request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'grpc-request');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-047 URL Bar: plain click opens a transient gRPC request', async ({ page }) => {
    const cm = buildGrpcCommonLocators(page).request.queryUrlContainer().locator('.CodeMirror');
    await expectLinkOpensRequest(page, cm, { type: 'grpc', url: url('grpc-url') });
  });

  test('TC-049 Body / Messages: plain click opens a transient gRPC request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Message');
    const cm = buildGrpcCommonLocators(page).request.messagesContainer().locator('.CodeMirror').first();
    await expectLinkOpensRequest(page, cm, { type: 'grpc', url: url('grpc-body') });
  });

  test('TC-055 Docs: plain click opens a transient gRPC request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle(pane(page)).click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(pane(page)), { type: 'grpc', url: url('grpc-docs') });
  });
});
