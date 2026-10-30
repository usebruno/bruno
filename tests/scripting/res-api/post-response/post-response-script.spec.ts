import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  fillRequestUrl,
  openRequest,
  selectResponsePaneTab,
  selectScriptSubTab,
  sendRequest,
  setCodeMirrorEditorValue
} from '../../../utils/page';

// Local echo from bruno-tests (auto-started by Playwright) returns that URL in the JSON body.
const REQUEST_URL = 'http://localhost:8081/api/echo/anything/post-response';

// The script reads the response the server sent back, so a pass means the
// post-response phase saw the real status and the parsed JSON body.
const postResponseScript = [
  'test("post-response script reads the response status", function () {',
  '  expect(res.getStatus()).to.equal(200);',
  '});',
  'test("post-response script reads the response body", function () {',
  `  expect(res.getBody().url).to.equal("${REQUEST_URL}");`,
  '});'
].join('\n');

test.describe('Post-response script', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should run a post-response script against the received response', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { codeMirror, request, response, tabs } = buildCommonLocators(page);
    const collectionName = 'post-response-script';
    const requestName = 'get';

    await test.step('Create a collection and a request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName);
      await openRequest(page, collectionName, requestName);
      await expect(tabs.requestTab(requestName)).toBeVisible();
    });

    await test.step('Enter a valid URL', async () => {
      await fillRequestUrl(page, REQUEST_URL);
      await expect(request.urlLine()).toContainText(REQUEST_URL);
    });

    await test.step('Add a post-response script that checks the response', async () => {
      await selectScriptSubTab(page, 'post-response');
      await setCodeMirrorEditorValue(page, 'post-response-script-editor', postResponseScript);
      await expect(codeMirror.byTestId('post-response-script-editor')).toContainText(REQUEST_URL);
    });

    await test.step('Send the request and verify the script passed for that response', async () => {
      await sendRequest(page);
      await expect(response.statusCode()).toContainText('200');
      await expect(response.pane()).toContainText(REQUEST_URL);

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
