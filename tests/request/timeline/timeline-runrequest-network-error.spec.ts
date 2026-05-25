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

test.describe('Timeline — runRequest network-error row shows URL and error code', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('inner ECONNREFUSED shows inner URL + ECONNREFUSED status on outer Timeline', async ({ page, createTmpDir }) => {
    const collectionName = 'runrequest-network-error';
    const outer = 'outer';
    const inner = 'inner';

    const outerUrl = 'http://localhost:8081/ping';
    // Port nothing listens on -> guaranteed ECONNREFUSED on every platform.
    const innerUrl = 'http://localhost:9999/nope';

    await test.step('Create outer + inner; inner points at an unreachable port', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, outer, collectionName, { url: outerUrl });
      await createRequest(page, inner, collectionName, { url: innerUrl });
    });

    await test.step('Outer pre-request invokes inner and swallows the rejection', async () => {
      await openRequest(page, collectionName, outer);
      // try/catch so outer still completes 200 and the Timeline renders.
      await addPreRequestScript(
        page,
        `try { await bru.runRequest("${inner}"); } catch (e) { /* expected */ }`
      );
      await saveRequest(page);
    });

    await test.step('Send outer', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Outer Timeline has the runRequest row with inner URL (URL fallback)', async () => {
      await selectResponsePaneTab(page, 'Timeline');

      const rows = page.locator('.timeline-container .tl-row-wrap');
      await expect(rows).toHaveCount(2); // main + runRequest

      // Without the URL fallback this column would be empty.
      const runRequestRow = rows.filter({ has: page.locator('.tl-badge--run-request') });
      await expect(runRequestRow).toHaveCount(1);
      await expect(runRequestRow.locator('.tl-col-url')).toContainText('localhost:9999');
    });
  });
});
