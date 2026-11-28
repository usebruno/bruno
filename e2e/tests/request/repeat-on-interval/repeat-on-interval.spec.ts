import { test, expect } from '../../../playwright';
import {
  buildRequestSendLocators,
  buildResponseLocators,
  closeAllCollections,
  closeAllTabs,
  createCollection,
  createRequest,
  openRequest,
  startRepeatOnInterval
} from '../../../pages';
import { startLocalServer } from '../../../servers';

const COLLECTION = 'repeat-on-interval';
const REQUEST = 'Counter';

test.describe('Repeat on Interval', () => {
  // Shared by the tests in a worker: each one only compares hits counted during its own run
  let hits = 0;
  let server: Awaited<ReturnType<typeof startLocalServer>>;

  test.beforeAll(async () => {
    server = await startLocalServer((_req, res) => {
      hits += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hits }));
    });
  });

  test.afterAll(() => {
    server?.close();
  });

  test.beforeEach(async ({ page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await createCollection(page, COLLECTION, await createTmpDir('repeat-on-interval'));
    await createRequest(page, REQUEST, COLLECTION, { url: server.url, method: 'GET' });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('sends the request repeatedly and stops on Cancel', async ({ page }) => {
    const send = buildRequestSendLocators(page);
    const startHits = hits;

    await test.step('Start repeating every second', async () => {
      await openRequest(page, COLLECTION, REQUEST);
      await startRepeatOnInterval(page, 1);
    });

    await test.step('The indicator shows the interval', async () => {
      await expect(send.repeatOnIntervalIndicator()).toBeVisible();
      await expect(send.repeatOnIntervalIndicator()).toContainText('every 1s');
    });

    await test.step('The request is sent repeatedly', async () => {
      await expect.poll(() => hits - startHits, { timeout: 10000 }).toBeGreaterThanOrEqual(3);
    });

    await test.step('Cancel stops the repetition', async () => {
      await send.sendButton().click();
      await expect(send.repeatOnIntervalIndicator()).toBeHidden();
      await expect(send.sendButton()).toHaveAttribute('data-action', 'send');

      const hitsAfterCancel = hits;
      // No locator can observe a request that must not happen: wait past two intervals
      await page.waitForTimeout(2500);
      expect(hits).toBe(hitsAfterCancel);
    });
  });

  test('stops repeating when the request tab is closed', async ({ page }) => {
    const send = buildRequestSendLocators(page);
    const intervalMs = 5000;
    let startedAt = 0;

    await test.step('Start repeating every 5 seconds', async () => {
      await openRequest(page, COLLECTION, REQUEST);
      const startHits = hits;
      // Taken before the schedule exists, so the next tick is due no earlier than startedAt + intervalMs
      startedAt = Date.now();
      await startRepeatOnInterval(page, intervalMs / 1000);
      // The first send is immediate
      await expect.poll(() => hits - startHits, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
      // The next tick is armed once that send settles, so let it reach the response pane before closing
      await expect(buildResponseLocators(page).statusCode()).toContainText('200');
    });

    await test.step('Closing the tab stops the repetition at once', async () => {
      const hitsAtClose = hits;
      const closedAt = Date.now();
      await closeAllTabs(page);
      await openRequest(page, COLLECTION, REQUEST);
      await expect(send.repeatOnIntervalIndicator()).toBeHidden();

      // Only a check made before the next tick proves the schedule ended on close, not on that tick
      expect(Date.now() - startedAt).toBeLessThan(intervalMs);

      // No locator can observe a request that must not happen: wait a full interval past the close
      await page.waitForTimeout(closedAt + intervalMs + 1500 - Date.now());
      expect(hits).toBe(hitsAtClose);
      await expect(send.repeatOnIntervalIndicator()).toBeHidden();
    });
  });
});
