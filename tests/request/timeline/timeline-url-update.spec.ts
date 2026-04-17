import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  sendRequest
} from '../../utils/page/actions';

/**
 * Select a tab in the response pane, handling the overflow dropdown (>>) if the tab is hidden.
 */
const selectResponsePaneTab = async (page, tabName: string) => {
  await test.step(`Select response pane tab "${tabName}"`, async () => {
    const responsePaneTabs = page.locator('.response-pane .tabs');
    const visibleTab = responsePaneTabs.getByRole('tab', { name: tabName });

    if (await visibleTab.isVisible()) {
      await visibleTab.click();
      return;
    }

    // Tab is hidden in the overflow dropdown (>> button)
    const overflowButton = responsePaneTabs.locator('.more-tabs');
    if (await overflowButton.isVisible()) {
      await overflowButton.click();
      const dropdownItem = page.locator('.tippy-box .dropdown-item').filter({ hasText: tabName });
      await dropdownItem.click();
    }
  });
};

test.describe('Timeline URL Update', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should show correct URL in timeline after changing request URL between sends', async ({ page, createTmpDir }) => {
    const collectionName = 'timeline-url-test';
    const firstUrl = 'http://localhost:8081/ping';
    const secondUrl = 'http://localhost:8081/headers';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'url-change-test', collectionName, { url: firstUrl });
    });

    await test.step('Send first request', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Change URL and send second request', async () => {
      // Click into the URL field, select all, then type the new URL
      // (fillRequestUrl appends in CodeMirror, so we clear manually)
      const urlEditor = page.locator('#request-url .CodeMirror');
      await urlEditor.click();
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+a`);
      await page.keyboard.type(secondUrl);
      await page.waitForTimeout(200);
      await sendRequest(page, 200);
    });

    await test.step('Open Timeline tab and verify URLs', async () => {
      await selectResponsePaneTab(page, 'Timeline');

      // Get all timeline entries
      const timelineItems = page.locator('.timeline-item');
      await expect(timelineItems).toHaveCount(2, { timeout: 5000 });

      // Most recent entry (first in list) should show the second URL
      const firstEntry = timelineItems.nth(0);
      await expect(firstEntry).toContainText('/headers');

      // Older entry (second in list) should show the first URL
      const secondEntry = timelineItems.nth(1);
      await expect(secondEntry).toContainText('/ping');
    });
  });
});
