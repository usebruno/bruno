import { test, expect } from '../../../playwright';
import { addVarsRow } from '../../utils/request/vars';
import {
  buildCommonLocators,
  closeAllCollections,
  closeAllOpenTabs,
  openFolderRequest,
  openFolderSettings,
  openVariablesTab,
  saveFolderSettings,
  selectfolderPaneTab,
  sendRequest
} from '../../utils/page';

const COLLECTION_NAME = 'folder-post-response-vars';
const FOLDER_NAME = 'api';
const REQUEST_NAME = 'ping';

const VAR_NAME = 'statusCode';
const VAR_EXPRESSION = 'res.status';

test.describe('Folder post-response vars', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-2824: Verify that the user is able add Post-Response vars for folder level settings', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { table, variablesTab } = buildCommonLocators(page);
    const postResponseVars = table('folder-vars-res');

    await test.step('Add a folder post-response variable', async () => {
      await openFolderSettings(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'vars');
      await addVarsRow(page, 'folder-vars-res', VAR_NAME, VAR_EXPRESSION);
      await saveFolderSettings(page);
    });

    await test.step('Verify the post-response variable persists after reopening folder settings', async () => {
      await closeAllOpenTabs(page);
      await openFolderSettings(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'vars');
      const reopenedRow = postResponseVars.rowByName(VAR_NAME);
      await expect(postResponseVars.rowNameInput(reopenedRow)).toHaveValue(VAR_NAME);
      await expect(postResponseVars.rowValueEditor(reopenedRow)).toContainText(VAR_EXPRESSION);
    });

    await test.step('Send a request in the folder and verify the post-response variable is evaluated', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
      await sendRequest(page, 200);
      await openVariablesTab(page, COLLECTION_NAME);
      await expect(variablesTab.row('runtime', VAR_NAME)).toContainText('200');
    });
  });
});
