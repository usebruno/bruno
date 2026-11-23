import { test, expect } from '../../../playwright';
import {
  buildRequestSendLocators,
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

test.describe.serial('Repeat on Interval', () => {
  let hits = 0;
  let server: Awaited<ReturnType<typeof startLocalServer>>;

  test.beforeAll(async ({ page, createTmpDir }) => {
    server = await startLocalServer((_req, res) => {
      hits += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hits }));
    });

    await page.locator('[data-app-state="loaded"]').waitFor();
    await createCollection(page, COLLECTION, await createTmpDir('repeat-on-interval'));
    await createRequest(page, REQUEST, COLLECTION, { url: server.url, method: 'GET' });
  });

  test.afterAll(async ({ page }) => {
    try {
      await closeAllCollections(page);
    } finally {
      server?.close();
    }
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

    await test.step('Start repeating every 3 seconds', async () => {
      await openRequest(page, COLLECTION, REQUEST);
      const startHits = hits;
      await startRepeatOnInterval(page, 3);
      // The first send is immediate
      await expect.poll(() => hits - startHits, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
    });

    await test.step('Closing the tab stops the repetition at once', async () => {
      const hitsAtClose = hits;
      await closeAllTabs(page);

      // Reopen before the next tick: the schedule must already be gone, not cleaned up by that tick
      await openRequest(page, COLLECTION, REQUEST);
      await expect(send.repeatOnIntervalIndicator()).toBeHidden();

      // No locator can observe a request that must not happen: wait past the next tick
      await page.waitForTimeout(4000);
      expect(hits).toBe(hitsAtClose);
      await expect(send.repeatOnIntervalIndicator()).toBeHidden();
    });
  });
});
