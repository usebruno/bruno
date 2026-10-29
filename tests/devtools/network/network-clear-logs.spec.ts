import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeDevToolsConsole,
  openCollection,
  openNetworkTab,
  openRequest,
  sendRequest,
  waitForAppLoaded
} from '../../utils/page';

const COLLECTION_NAME = 'network-log-scroll';
const REQUEST_NAME = 'network-log-scroll';

test.describe('DevTools Network Tab Clear', () => {
  test('clears every network request row from the Network tab', async ({ pageWithUserData: page }) => {
    const { devtools, response } = buildCommonLocators(page);

    await waitForAppLoaded(page);

    await test.step('Send a request so the Network tab has an entry', async () => {
      await openCollection(page, COLLECTION_NAME);
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await sendRequest(page, 200);
    });

    await test.step('Open DevTools → Network and confirm the request is listed', async () => {
      await openNetworkTab(page);
      await expect(devtools.networkRows().first()).toBeVisible();
    });

    await test.step('Clear the network requests from the tab controls', async () => {
      await expect(devtools.clearNetworkLogs()).toBeVisible();
      await devtools.clearNetworkLogs().click();

      await expect(devtools.networkRows()).toHaveCount(0);
      await expect(devtools.networkEmpty()).toBeVisible();
    });

    await test.step('Confirm the request remains in its Response Timeline', async () => {
      await closeDevToolsConsole(page);
      const timelineTab = response.pane().getByRole('tab', { name: 'Timeline' });
      if (await timelineTab.isVisible()) {
        await timelineTab.click();
      } else {
        await response.tabsOverflowButton().click();
        await response.tabsOverflowItem('Timeline').click();
      }
      await expect(page.getByTestId('timeline-container').getByTestId('timeline-entry')).toHaveCount(1);
    });
  });
});
