import { Page, test } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, expectLinkOpensRequest, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, openCollectionFromDialog, openfolder, selectfolderPaneTab } from '../../utils/page';

const FOLDER_NAME = 'folder-fixture';
const settings = (page: Page) => page.locator('.folder-settings-content');
const url = (path: string) => `http://link-aware.test/${path}`;

test.describe('CodeMirror link-aware — Folder settings', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openfolder(page, COLLECTION_NAME, FOLDER_NAME, { persist: true });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-103 Vars: plain click creates a transient request', async ({ page }) => {
    await selectfolderPaneTab(page, 'vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('folder-vars') });
  });

  test('TC-105 Pre-Request-Script: plain click creates a transient request', async ({ page }) => {
    await selectfolderPaneTab(page, 'script');
    const locators = buildCommonLocators(page);
    await locators.paneTabs.tabTrigger('pre-request').click();
    const cm = locators.codeMirror.byTestId('folder-pre-request-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('folder-script') });
  });

  test('TC-105 Post-Response-Script: plain click creates a transient request', async ({ page }) => {
    await selectfolderPaneTab(page, 'script');
    const locators = buildCommonLocators(page);
    await locators.paneTabs.tabTrigger('post-response').click();
    const cm = locators.codeMirror.byTestId('folder-post-response-script-editor');
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('folder-script') });
  });

  test('TC-107 Tests: plain click creates a transient request', async ({ page }) => {
    await selectfolderPaneTab(page, 'test');
    const cm = buildCommonLocators(page).codeMirror.within(settings(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('folder-tests') });
  });

  test('TC-109 Docs: plain click creates a transient request', async ({ page }) => {
    await selectfolderPaneTab(page, 'docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle(settings(page)).click();
    await expectLinkOpensRequest(page, locators.codeMirror.within(settings(page)), { type: 'http', url: url('folder-docs') });
  });

  test('TC-111 Folder Settings use the parent collections Presets (HTTP), not a folder-local default', async ({ page }) => {
    await selectfolderPaneTab(page, 'vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
    await expectLinkOpensRequest(page, cm, { type: 'http', url: url('folder-vars') });
  });
});
