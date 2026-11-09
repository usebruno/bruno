import { test, expect } from '../../../playwright';
import { addVarsRow } from '../../utils/request/vars';
import {
  buildCommonLocators,
  closeAllCollections,
  openFolderRequest,
  openFolderSettings,
  saveFolderSettings,
  selectfolderPaneTab,
  selectResponsePaneTab,
  sendRequest
} from '../../utils/page';

const COLLECTION_NAME = 'folder-post-response-vars';
const FOLDER_NAME = 'api';
const REQUEST_NAME = 'using-var';

const VAR_NAME = 'baseUrl';
const VAR_VALUE = 'http://localhost:8081/ping';

test.describe('Folder pre-request vars', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-184: Verify that the user is able add Pre-request vars for folder level settings', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { timeline } = buildCommonLocators(page);

    await test.step('Add a folder pre-request variable', async () => {
      await openFolderSettings(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'vars');
      await addVarsRow(page, 'folder-vars-req', VAR_NAME, VAR_VALUE);
      await saveFolderSettings(page);
    });

    await test.step('Send a request whose URL is the folder pre-request variable', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
      await sendRequest(page, 200);
      await selectResponsePaneTab(page, 'Timeline');
      await expect(timeline.entries().first()).toContainText(VAR_VALUE);
    });
  });
});
