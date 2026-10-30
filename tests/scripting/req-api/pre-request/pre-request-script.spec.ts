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
const REQUEST_URL = 'http://localhost:8081/api/echo/anything/pre-request';

// The script reads the URL that was typed into the request, so a pass means
// the pre-request phase saw that same address before the call went out.
const preRequestScript = [
  'test("pre-request script reads the entered URL", function () {',
  `  expect(req.getUrl()).to.equal("${REQUEST_URL}");`,
  '});'
].join('\n');

test.describe('Pre-request script', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should run a pre-request script against the entered URL', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { codeMirror, request, response, tabs } = buildCommonLocators(page);
    const collectionName = 'pre-request-script';
    const requestName = 'get';

    await test.step('Arrange a collection and an empty request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName);
      await openRequest(page, collectionName, requestName);
      await expect(tabs.requestTab(requestName)).toBeVisible();
    });

    await test.step('Enter a valid URL', async () => {
      await fillRequestUrl(page, REQUEST_URL);
      await expect(request.urlLine()).toContainText(REQUEST_URL);
    });

    await test.step('Add a pre-request script that checks that URL', async () => {
      await selectScriptSubTab(page, 'pre-request');
      await setCodeMirrorEditorValue(page, 'pre-request-script-editor', preRequestScript);
      await expect(codeMirror.byTestId('pre-request-script-editor')).toContainText(REQUEST_URL);
    });

    await test.step('Send the request and verify the script passed for that URL', async () => {
      await sendRequest(page);
      await expect(response.statusCode()).toContainText('200');
      await expect(response.pane()).toContainText(REQUEST_URL);

      await selectResponsePaneTab(page, 'Tests');
      await expect(response.testSummary('preRequest')).toContainText(
        'Pre-Request Tests (1), Passed: 1, Failed: 0'
      );
      await expect(response.assertionResults.passed()).toContainText(
        'pre-request script reads the entered URL'
      );
    });
  });
});
