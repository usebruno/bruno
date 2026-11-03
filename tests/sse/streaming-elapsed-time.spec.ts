import { test, expect, Page } from '../../playwright';
import { openRequest, sendRequest, switchToOpenTab } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const elapsedSeconds = async (page: Page) => {
  const text = await buildCommonLocators(page).response.elapsedTime().innerText();
  return parseFloat(text.replace('s', ''));
};

test.describe('SSE Elapsed Time', () => {
  test('preserves elapsed time when navigating away from and back to a running stream', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);
    let elapsedBefore = 0;

    await openRequest(page, 'sse-test', 'sse-stream-request');
    await sendRequest(page);

    await test.step('The counter runs while the stream is open', async () => {
      await expect.poll(() => elapsedSeconds(page), { timeout: 10000 }).toBeGreaterThan(3);
      elapsedBefore = await elapsedSeconds(page);
    });

    await test.step('Switch to another request, stay there a second, then come back', async () => {
      await openRequest(page, 'sse-test', 'ping-request');
      await expect(locators.response.elapsedTime()).toBeHidden();
      await switchToOpenTab(page, 'sse-stream-request');
    });

    await test.step('The elapsed time is not reset after switching back to the stream', async () => {
      await expect(locators.response.elapsedTime()).toBeVisible();
      expect(await elapsedSeconds(page)).toBeGreaterThanOrEqual(elapsedBefore);
    });
  });
});
