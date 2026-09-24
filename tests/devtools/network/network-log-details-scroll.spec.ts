import { test, expect, type Locator } from '../../../playwright';
import { openCollection, openRequest, sendRequest } from '../../utils/page';

const COLLECTION_NAME = 'network-log-scroll';
const REQUEST_NAME = 'network-log-scroll';

const isEntryVisibleInScroller = async (scroller: Locator, entry: Locator) => {
  const entryHandle = await entry.elementHandle();
  if (!entryHandle) {
    return false;
  }

  return scroller.evaluate((container, entryEl) => {
    const containerRect = container.getBoundingClientRect();
    const entryRect = entryEl.getBoundingClientRect();

    return (
      entryRect.height > 0
      && entryRect.top >= containerRect.top - 1
      && entryRect.bottom <= containerRect.bottom + 1
    );
  }, entryHandle);
};

test.describe('DevTools Network Log Details Scroll', () => {
  test('last network log lines are visible and scrollable in request details panel', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Open fixture request and send it', async () => {
      await openCollection(page, COLLECTION_NAME);
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await sendRequest(page, 200);
    });

    await test.step('Open DevTools Network tab and select the request', async () => {
      await page.locator('button[data-trigger="dev-tools"]').click();
      await expect(page.locator('.console-header')).toBeVisible();

      const networkTab = page.locator('.console-tab').filter({ hasText: 'Network' });
      await expect(networkTab).toBeVisible();
      await networkTab.click();
      await expect(networkTab).toHaveClass(/active/);

      const requestRow = page.getByTestId('network-request-row').first();
      await expect(requestRow).toBeVisible();
      await requestRow.click();
    });

    const panel = page.locator('.details-panel-wrapper');
    const outerScroller = panel.locator('.panel-content');
    const innerScroller = panel.locator('.network-logs-wrapper .network-logs-container');
    const lastEntry = innerScroller.locator('.network-logs-entry').last();

    await test.step('Open Network sub-tab in request details panel', async () => {
      await expect(panel.getByText('Request Details')).toBeVisible();
      const networkSubTab = panel.locator('.tab-button').filter({ hasText: 'Network' });
      await expect(networkSubTab).toBeVisible();
      await networkSubTab.click();
      await expect(networkSubTab).toHaveClass(/active/);
      await expect(innerScroller).toBeVisible();
    });

    await test.step('Verify nested inner scroller overflows', async () => {
      const innerOverflows = await innerScroller.evaluate((el) => el.scrollHeight > el.clientHeight);
      expect(innerOverflows).toBe(true);
      await expect(lastEntry).toContainText(/Request completed in/);
    });

    await test.step('Outer panel scroll alone does not reveal the last log line', async () => {
      const initialOuterScrollTop = await outerScroller.evaluate((el) => el.scrollTop);
      expect(initialOuterScrollTop).toBe(0);

      await outerScroller.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });

      await expect.poll(() => isEntryVisibleInScroller(innerScroller, lastEntry)).toBe(false);

      await outerScroller.evaluate((el) => {
        el.scrollTop = 0;
      });
    });

    await test.step('Scroll nested inner container and verify last log line is visible in viewport', async () => {
      await expect(async () => {
        await innerScroller.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });

        const scrollTop = await innerScroller.evaluate((el) => el.scrollTop);
        expect(scrollTop).toBeGreaterThan(0);

        await expect(lastEntry).toBeVisible({ timeout: 1000 });
        expect(await isEntryVisibleInScroller(innerScroller, lastEntry)).toBe(true);
      }).toPass({ timeout: 10000 });

      const outerScrollTop = await outerScroller.evaluate((el) => el.scrollTop);
      expect(outerScrollTop).toBe(0);
    });
  });
});
