import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollectionFromDialog,
  openRequest,
  selectResponsePaneTab,
  selectScriptSubTab,
  sendRequest,
  setCodeMirrorEditorValue,
  waitForCollectionMount
} from '../../../utils/page';

const REQUEST_URL = 'http://localhost:8081/api/echo/anything/pre-request';

const preRequestScript = [
  'test("pre-request script reads the entered URL", function () {',
  `  expect(req.getUrl()).to.equal("${REQUEST_URL}");`,
  '});'
].join('\n');

const COLLECTION_NAME = 'pre-request-script';
const REQUEST_NAME = 'echo';

test.describe('Pre-request script', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-197: Verify user can add and run Pre-request script for a request', { tag: '@sanity' }, async ({
    page,
    electronApp,
    collectionFixturePath
  }) => {
    const { response, tabs } = buildCommonLocators(page);

    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await waitForCollectionMount(page, COLLECTION_NAME);
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await tabs.requestTab(REQUEST_NAME).waitFor({ state: 'visible', timeout: 5000 });

    await selectScriptSubTab(page, 'pre-request');
    await setCodeMirrorEditorValue(page, 'pre-request-script-editor', preRequestScript);

    await sendRequest(page);
    await selectResponsePaneTab(page, 'Tests');

    await test.step('Verify pre-request script tests passed', async () => {
      await expect(response.testSummary('preRequest')).toContainText(
        'Pre-Request Tests (1), Passed: 1, Failed: 0'
      );
      await expect(response.assertionResults.passed()).toContainText(
        'pre-request script reads the entered URL'
      );
    });
  });
});
