import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  isLocatorVisibleInScroller,
  openCollection,
  openDevToolsConsoleTab,
  openRequest,
  selectFirstDevToolsNetworkRequest,
  selectRequestDetailsPanelTab,
  sendRequest
} from '../../utils/page';

const COLLECTION_NAME = 'network-log-scroll';
const REQUEST_NAME = 'network-log-scroll';

test.describe('DevTools Network Log Details Scroll', () => {
  test('last network log lines are visible and scrollable in request details panel', async ({ pageWithUserData: page }) => {
    const { devTools } = buildCommonLocators(page);

    await test.step('Open fixture request and send it', async () => {
      await openCollection(page, COLLECTION_NAME);
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await sendRequest(page, 200);
    });

    await openDevToolsConsoleTab(page, 'Network');
    await selectFirstDevToolsNetworkRequest(page);

    const detailsPanel = devTools.requestDetailsPanel();
    const outerScroller = detailsPanel.content();
    const innerScroller = detailsPanel.networkLogsContainer();
    const lastEntry = detailsPanel.networkLogEntries().last();

    await test.step('Open Network sub-tab in request details panel', async () => {
      await selectRequestDetailsPanelTab(page, 'Network');
      await expect(innerScroller).toBeVisible();
    });

    await test.step('Verify nested inner scroller overflows', async () => {
      const innerOverflows = await innerScroller.evaluate((el) => el.scrollHeight > el.clientHeight);
      expect(innerOverflows).toBe(true);
      await expect(lastEntry).toContainText(/Request completed in/);
    });

    await test.step('Outer panel scroll alone does not reveal the last log line', async () => {
      expect(await outerScroller.evaluate((el) => el.scrollTop)).toBe(0);

      await outerScroller.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });

      await expect.poll(
        () => isLocatorVisibleInScroller(innerScroller, lastEntry),
        { message: 'Last network log entry should remain hidden until the nested scroller moves' }
      ).toBe(false);

      await outerScroller.evaluate((el) => {
        el.scrollTop = 0;
      });
    });

    await test.step('Scroll nested inner container and verify last log line is visible in viewport', async () => {
      await expect(async () => {
        const scrollTop = await innerScroller.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
          return el.scrollTop;
        });
        expect(scrollTop).toBeGreaterThan(0);

        await expect(lastEntry).toBeVisible({ timeout: 1000 });
        expect(await isLocatorVisibleInScroller(innerScroller, lastEntry)).toBe(true);
      }).toPass({ timeout: 10000 });

      expect(await outerScroller.evaluate((el) => el.scrollTop)).toBe(0);
    });
  });
});
