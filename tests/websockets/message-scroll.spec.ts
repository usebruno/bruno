import { expect, test } from '../../playwright';
import { openRequest, selectRequestPaneTab, closeAllCollections } from '../utils/page/actions';

const COLLECTION_NAME = 'collection';
const LONG_MSG_REQ = 'ws-long-msg';

test.describe('websocket message list scroll on tab switch', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('does not scroll the expanded message list when switching request pane tabs', async ({
    pageWithUserData: page
  }) => {
    await openRequest(page, COLLECTION_NAME, LONG_MSG_REQ);

    const container = page.getByTestId('ws-messages-container');
    await expect(container).toBeVisible();

    // The first (long) message is expanded by default. Ensure its editor is
    // rendered so the container has enough content to overflow.
    await expect(page.getByTestId('ws-message-body-0')).toBeVisible();

    // the container must actually be scrollable.
    await expect
      .poll(() => container.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    // Start from the top of the list.
    await container.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBe(0);

    // Switch away from the Message tab and back — this remounts WsBody.
    await selectRequestPaneTab(page, 'Headers');
    await expect(page.getByTestId('ws-messages-container')).toBeHidden();
    await selectRequestPaneTab(page, 'Message');

    await expect(container).toBeVisible();
    await expect(page.getByTestId('ws-message-body-0')).toBeVisible();

    // The scroll position must not have jumped to the bottom on remount.
    await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBe(0);
  });

  test('restores the scroll position when switching back to the Message tab', async ({
    pageWithUserData: page
  }) => {
    await openRequest(page, COLLECTION_NAME, LONG_MSG_REQ);

    const container = page.getByTestId('ws-messages-container');
    await expect(container).toBeVisible();
    await expect(page.getByTestId('ws-message-body-0')).toBeVisible();

    // The container must actually be scrollable.
    await expect
      .poll(() => container.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    // Scroll to a specific position partway down the list.
    const targetScroll = await container.evaluate((el) => {
      const target = Math.floor((el.scrollHeight - el.clientHeight) / 2);
      el.scrollTop = target;
      return el.scrollTop;
    });
    expect(targetScroll).toBeGreaterThan(0);
    await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBe(targetScroll);

    // Switch away from the Message tab and back — this remounts WsBody.
    await selectRequestPaneTab(page, 'Headers');
    await expect(page.getByTestId('ws-messages-container')).toBeHidden();
    await selectRequestPaneTab(page, 'Message');

    await expect(container).toBeVisible();
    await expect(page.getByTestId('ws-message-body-0')).toBeVisible();

    // The scroll position must be restored to where we left off.
    await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBe(targetScroll);
  });
});
