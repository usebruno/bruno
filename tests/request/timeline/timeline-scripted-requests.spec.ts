import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  openRequest,
  expandFolder,
  addPreRequestScript,
  addPostResponseScript,
  addFolderScript,
  addCollectionScript,
  saveRequest,
  sendRequest,
  selectResponsePaneTab
} from '../../utils/page/actions';
import { runCollection } from '../../utils/page/runner';

test.describe('Timeline — scripted requests (sendRequest / runRequest)', () => {
  // Each test sets up its own collection and tears it down. No shared state.
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('captures collection/folder/request pre-request scripts with correct badges, counts, ordering, and filter behavior', async ({ page, createTmpDir }) => {
    const collectionName = 'timeline-scripted-test';
    const folderName = 'driver-folder';
    const driverRequest = 'driver-request';
    const driverUrl = 'http://localhost:8081/ping';
    // Three pre-request sendRequest calls cascade collection → folder → request.
    const collectionSendUrl = 'http://localhost:8081/api/echo/path/collection';
    const folderSendUrl = 'http://localhost:8081/headers';
    const requestSendUrl = 'http://localhost:8081/query';

    await test.step('Create collection, folder, and a single request inside the folder', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createFolder(page, folderName, collectionName);
      // Newly-created folders are collapsed; expand so the new request becomes visible.
      await expandFolder(page, folderName);
      await createRequest(page, driverRequest, folderName, { url: driverUrl, inFolder: true });
    });

    await test.step('Add collection, folder, and request pre-request scripts (each does its own sendRequest)', async () => {
      await addCollectionScript(page, collectionName, 'pre-request', `await bru.sendRequest({ url: "${collectionSendUrl}", method: "GET" });`);
      await addFolderScript(page, folderName, 'pre-request', `await bru.sendRequest({ url: "${folderSendUrl}", method: "GET" });`);
      await page.locator('.collection-item-name').filter({ hasText: driverRequest }).first().click();
      await addPreRequestScript(page, `await bru.sendRequest({ url: "${requestSendUrl}", method: "GET" });`);
      await saveRequest(page);
    });

    await test.step('Send the driver request', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Open Timeline and assert four rows', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const rows = page.getByTestId('timeline-container').getByTestId('timeline-entry');
      await expect(rows).toHaveCount(4);
    });

    await test.step('Filter chips appear with correct counts (only Request + Pre-Request show)', async () => {
      const filterBar = page.getByTestId('timeline-filter-bar');
      await expect(filterBar.getByRole('button')).toHaveCount(3); // All, Request, Pre-Request

      const countFor = (id: string) =>
        page.getByTestId(`timeline-chip-${id}`).getByTestId('timeline-chip-count');

      await expect(countFor('all')).toHaveText('4');
      await expect(countFor('main')).toHaveText('1');
      await expect(countFor('pre')).toHaveText('3');
    });

    await test.step('Rows are sorted newest-first; the collection-script row sits last', async () => {
      const rows = page.getByTestId('timeline-container').getByTestId('timeline-entry');

      // Execution order: collection → folder → request → main.
      // Newest-first: main → request-script → folder-script → collection-script.
      await expect(rows.nth(0).getByTestId('timeline-badge-main')).toHaveCount(1);

      const requestScriptRow = rows.nth(1);
      await expect(requestScriptRow.getByTestId('timeline-badge-pre')).toHaveCount(1);
      await expect(requestScriptRow.getByTestId('timeline-url')).toContainText('/query');

      const folderScriptRow = rows.nth(2);
      await expect(folderScriptRow.getByTestId('timeline-badge-pre')).toHaveCount(1);
      await expect(folderScriptRow.getByTestId('timeline-url')).toContainText('/headers');

      const collectionScriptRow = rows.nth(3);
      await expect(collectionScriptRow.getByTestId('timeline-badge-pre')).toHaveCount(1);
      await expect(collectionScriptRow.getByTestId('timeline-url')).toContainText('/echo/path');
    });

    await test.step('Clicking the Pre-Request chip narrows to the three sendRequest rows', async () => {
      await page.getByTestId('timeline-chip-pre').click();

      const visibleRows = page.getByTestId('timeline-container').getByTestId('timeline-entry');
      await expect(visibleRows).toHaveCount(3);
      await expect(visibleRows.getByTestId('timeline-badge-pre')).toHaveCount(3);
    });

    await test.step('Clicking All restores every row', async () => {
      await page.getByTestId('timeline-chip-all').click();
      await expect(page.getByTestId('timeline-container').getByTestId('timeline-entry')).toHaveCount(4);
    });
  });

  test('collection runner shows scripted entries on the runner timeline (isolated from collection.timeline)', async ({ page, createTmpDir }) => {
    const runnerCollection = 'timeline-runner-test';
    const runnerTarget = 'runner-target';
    const runnerDriver = 'runner-driver';
    const runnerTargetUrl = 'http://localhost:8081/ping';
    const runnerDriverUrl = 'http://localhost:8081/ping';
    const runnerSendUrl = 'http://localhost:8081/headers';

    await test.step('Set up collection with target and driver requests + scripts', async () => {
      await createCollection(page, runnerCollection, await createTmpDir(runnerCollection));
      await createRequest(page, runnerTarget, runnerCollection, { url: runnerTargetUrl });
      await createRequest(page, runnerDriver, runnerCollection, { url: runnerDriverUrl });

      await openRequest(page, runnerCollection, runnerDriver);
      await addPreRequestScript(page, `await bru.sendRequest({ url: "${runnerSendUrl}", method: "GET" });`);
      await addPostResponseScript(page, `await bru.runRequest("${runnerTarget}");`);
      await saveRequest(page);
    });

    await test.step('Run the collection', async () => {
      await runCollection(page, runnerCollection);
    });

    await test.step('Open the driver request in the runner result and switch to Timeline', async () => {
      await page.getByTestId('runner-result-item').filter({ hasText: runnerDriver }).locator('.link').first().click();

      // Runner ResponsePane has its own tab strip (no data-testid="response-pane"),
      // so target the tab by role within the active panel.
      const timelineTab = page.locator('[role="tab"]').filter({ hasText: 'Timeline' }).last();
      await timelineTab.click();
    });

    await test.step('Runner timeline shows main + sendRequest + runRequest rows', async () => {
      const rows = page.getByTestId('timeline-entry');
      await expect(rows).toHaveCount(3, { timeout: 10000 });

      await expect(rows.getByTestId('timeline-badge-main')).toHaveCount(1);
      await expect(rows.getByTestId('timeline-badge-pre')).toHaveCount(1);
      await expect(rows.getByTestId('timeline-badge-post')).toHaveCount(1);

      // The runner view never shows the filter chip bar (no chip-bar UI here).
      await expect(page.getByTestId('timeline-filter-bar')).toHaveCount(0);
    });
  });
});
