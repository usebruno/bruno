import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeAllOpenTabs,
  openfolder,
  openFolderRequest,
  saveFolderSettings,
  selectfolderPaneTab,
  selectFolderScriptPaneTab,
  selectResponsePaneTab,
  sendRequest,
  setCodeMirrorValue
} from '../../utils/page';
import { closeDevToolsConsole, openDevTools, selectDevToolsConsoleTab } from '../../utils/page/devtools-console';

const COLLECTION_NAME = 'folder-post-response';
const FOLDER_NAME = 'api';
const REQUEST_NAME = 'ping';

const PRE_REQUEST_MESSAGE = 'Pre request executed';
const PRE_REQUEST_HEADER = 'X-Pre-Request';
const PRE_REQUEST_HEADER_VALUE = 'executed';
const PRE_REQUEST_LOG_LINE = `console.log('${PRE_REQUEST_MESSAGE}')`;
const PRE_REQUEST_HEADER_LINE = `req.setHeader('${PRE_REQUEST_HEADER}', '${PRE_REQUEST_HEADER_VALUE}')`;
const PRE_REQUEST_SCRIPT = `${PRE_REQUEST_LOG_LINE}\n${PRE_REQUEST_HEADER_LINE}`;

test.describe('Folder pre-request script', () => {
  test.describe.configure({ timeout: 60_000 });
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeDevToolsConsole(page);
    await closeAllCollections(page);
  });

  test('TC-182: Verify that user is able to add Pre-request Script for folder level settings', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { devtools, folder, timeline, timelineHeaders } = buildCommonLocators(page);
    const preRequestEditor = folder.preRequestScriptEditor();

    await test.step('Add a folder pre-request script', async () => {
      await openfolder(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'script');
      await selectFolderScriptPaneTab(page, 'pre-request');
      await setCodeMirrorValue(preRequestEditor, PRE_REQUEST_SCRIPT);
      await saveFolderSettings(page);
    });

    await test.step('Verify that the script persists after saving', async () => {
      await closeAllOpenTabs(page);
      await openfolder(page, COLLECTION_NAME, FOLDER_NAME);
      await selectfolderPaneTab(page, 'script');
      await selectFolderScriptPaneTab(page, 'pre-request');
      await expect(preRequestEditor).toContainText(PRE_REQUEST_LOG_LINE);
      await expect(preRequestEditor).toContainText(PRE_REQUEST_HEADER_LINE);
    });
    await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
    await sendRequest(page, 200);

    await test.step('Verify the pre-request script runs before the request under the folder', async () => {
      await openDevTools(page);
      await selectDevToolsConsoleTab(page);
      await expect(devtools.logEntry(PRE_REQUEST_MESSAGE)).toBeVisible();
      await selectResponsePaneTab(page, 'Timeline');
      await timeline.itemHeader(timeline.items().first()).click();
      await expect(timelineHeaders.row(PRE_REQUEST_HEADER)).toHaveCount(1);
      await expect(timelineHeaders.value(PRE_REQUEST_HEADER)).toHaveText(PRE_REQUEST_HEADER_VALUE);
    });
  });
});
