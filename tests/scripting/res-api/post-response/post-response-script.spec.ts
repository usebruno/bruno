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

// The request in fixtures/collection already carries this URL. The script reads
// the response the server sent back, so a pass means the post-response phase
// saw the real status and the parsed JSON body.
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

  test('should run a post-response script against the received response', { tag: '@sanity' }, async ({
    page,
    electronApp,
    collectionFixturePath
  }) => {
    const { response, tabs } = buildCommonLocators(page);

    await test.step('Open the collection and request', async () => {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await waitForCollectionMount(page, COLLECTION_NAME);
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await tabs.requestTab(REQUEST_NAME).waitFor({ state: 'visible', timeout: 5000 });
    });

    await test.step('Add a post-response script that checks the response', async () => {
      await selectScriptSubTab(page, 'post-response');
      await setCodeMirrorEditorValue(page, 'post-response-script-editor', postResponseScript);
    });

    await test.step('Send the request and verify the script passed for that response', async () => {
      await sendRequest(page);
      await selectResponsePaneTab(page, 'Tests');
      await expect(response.testSummary('postResponse')).toContainText(
        'Post-Response Tests (2), Passed: 2, Failed: 0'
      );
      await expect(response.assertionResults.passed()).toContainText([
        'post-response script reads the response status',
        'post-response script reads the response body'
      ]);
    });
  });
});
