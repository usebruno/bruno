import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openfolder,
  openFolderRequest,
  saveFolderSettings,
  selectfolderPaneTab,
  selectResponsePaneTab,
  sendRequest,
  setCodeMirrorValue
} from '../../utils/page';

const COLLECTION_NAME = 'folder-level-tests';
const FOLDER_NAME = 'api';
const REQUEST_NAME = 'ping';

const FOLDER_TEST_NAME = 'res.status == 200';
const FOLDER_TEST = `test("${FOLDER_TEST_NAME}", function () {
  expect(res.status).to.equal(200);
});`;

test.describe('Folder level tests', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-188: Verify that Folder level tests results under the tests section of response side.', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { folder, response } = buildCommonLocators(page);
    const testsEditor = folder.testsEditor();

    await test.step('Add a folder-level test', async () => {
      await openfolder(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'test');
      await setCodeMirrorValue(testsEditor, FOLDER_TEST);
      await saveFolderSettings(page);
    });

    await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
    await sendRequest(page, 200);

    await test.step('Review the folder-level test results in the response Tests tab', async () => {
      await selectResponsePaneTab(page, 'Tests');
      await expect(response.assertionResults.rows()).toContainText(FOLDER_TEST_NAME);
      await expect(response.assertionResults.passed()).toHaveCount(1);
    });
  });
});
