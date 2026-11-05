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

const REQUEST_URL = 'http://localhost:8081/api/echo/anything/post-response';

const postResponseScript = [
  'test("post-response script reads the response status", function () {',
  '  expect(res.getStatus()).to.equal(200);',
  '});',
  'test("post-response script reads the response body", function () {',
  `  expect(res.getBody().url).to.equal("${REQUEST_URL}");`,
  '});'
].join('\n');

const COLLECTION_NAME = 'post-response-script';
const REQUEST_NAME = 'echo';

test.describe('Post-response script', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test(
    'TC-2746: Verify user can add and run Post-response script for a request',
    { tag: '@sanity' },
    async ({ page, electronApp, collectionFixturePath }) => {
      const { response, tabs } = buildCommonLocators(page);

      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await waitForCollectionMount(page, COLLECTION_NAME);
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await tabs.requestTab(REQUEST_NAME).waitFor({ state: 'visible', timeout: 5000 });

      await selectScriptSubTab(page, 'post-response');
      await setCodeMirrorEditorValue(page, 'post-response-script-editor', postResponseScript);

      await sendRequest(page);
      await selectResponsePaneTab(page, 'Tests');

      // Assert
      await test.step('Verify post-response script tests passed', async () => {
        await expect(response.testSummary('postResponse')).toContainText(
          'Post-Response Tests (2), Passed: 2, Failed: 0'
        );
        await expect(response.assertionResults.passed()).toContainText([
          'post-response script reads the response status',
          'post-response script reads the response body'
        ]);
      });
    }
  );
});
