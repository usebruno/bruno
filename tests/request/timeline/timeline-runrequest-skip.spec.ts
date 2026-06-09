import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  addPreRequestScript,
  saveRequest,
  sendRequest,
  selectResponsePaneTab
} from '../../utils/page/actions';

test.describe('Timeline — bru.runRequest skips unsupported item types', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('shows Skipped rows for WS and gRPC targets', async ({ page, createTmpDir }) => {
    const collectionName = 'runrequest-skip';
    const driver = 'driver';

    await test.step('Create collection with HTTP driver + WS and gRPC targets', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, driver, collectionName, { url: 'http://localhost:8081/ping' });
      await createRequest(page, 'ws-target', collectionName, { url: 'ws://localhost:8081/ws', requestType: 'ws' });
      await createRequest(page, 'grpc-target', collectionName, { url: 'grpc://localhost:50051', requestType: 'grpc' });
    });

    await test.step('Pre-request script calls bru.runRequest on both unsupported targets', async () => {
      await openRequest(page, collectionName, driver);
      await addPreRequestScript(
        page,
        `await bru.runRequest("ws-target");\nawait bru.runRequest("grpc-target");`
      );
      await saveRequest(page);
    });

    await test.step('Send driver request', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Timeline has main + two Skipped runRequest rows', async () => {
      await selectResponsePaneTab(page, 'Timeline');

      const rows = page.locator('.timeline-container .tl-row-wrap');
      await expect(rows).toHaveCount(3);

      const skippedRows = rows.filter({ has: page.locator('.tl-badge--run-request') });
      await expect(skippedRows).toHaveCount(2);
      await expect(skippedRows.nth(0).locator('.timeline-status')).toContainText('Skipped');
      await expect(skippedRows.nth(1).locator('.timeline-status')).toContainText('Skipped');
    });
  });
});
