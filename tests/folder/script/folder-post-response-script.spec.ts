import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeAllOpenTabs,
  openfolder,
  openFolderRequest,
  openEnvironmentConfigTab,
  saveFolderSettings,
  selectfolderPaneTab,
  selectFolderScriptPaneTab,
  sendRequest,
  setCodeMirrorValue
} from '../../utils/page';

const COLLECTION_NAME = 'folder-post-response';
const FOLDER_NAME = 'api';
const REQUEST_NAME = 'ping';

const POST_RESPONSE_SCRIPT = [
  'const response = res.getBody();',
  '',
  'bru.setEnvVar("status", res.status);'
].join('\n');

test.describe('Folder post-response script', () => {
  test.describe.configure({ timeout: 60_000 });
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-2816: Verify that user is able to add Post-response Script for folder level settings', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { environment, folder } = buildCommonLocators(page);
    const postResponseEditor = folder.postResponseScriptEditor();

    await test.step('Add a folder post-response script', async () => {
      await openfolder(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'script');
      await selectFolderScriptPaneTab(page, 'post-response');
      await setCodeMirrorValue(postResponseEditor, POST_RESPONSE_SCRIPT);
      await saveFolderSettings(page);
    });

    await test.step('Verify that the script persists after saving', async () => {
      await closeAllOpenTabs(page);
      await openfolder(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'script');
      await selectFolderScriptPaneTab(page, 'post-response');
      await expect(postResponseEditor).toContainText('const response = res.getBody();');
      await expect(postResponseEditor).toContainText('bru.setEnvVar("status", res.status);');
    });
    await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
    await sendRequest(page, 200);

    await test.step('Verify the variable is added successfully', async () => {
      await openEnvironmentConfigTab(page);
      await expect(environment.varRow('status')).toBeVisible();
      await expect(environment.varRowLine('status')).toHaveText('200');
    });
  });
});
