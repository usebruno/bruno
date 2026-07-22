import { expect, test } from '../../playwright';
import { openRequest, selectRequestPaneTab, closeAllCollections } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

const COLLECTION_NAME = 'collection';
const LONG_MSG_REQ = 'ws-long-msg';
const TWO_MSG_REQ = 'ws-two-long-msgs';

test.describe('websocket message list scroll on tab switch', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('does not scroll the expanded message list when switching request pane tabs', async ({
    pageWithUserData: page
  }) => {
    const { websocket } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, LONG_MSG_REQ);

    const container = websocket.message.container();
    await expect(container).toBeVisible();

    await expect(websocket.message.body(0)).toBeVisible();

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
    await expect(container).toBeHidden();
    await selectRequestPaneTab(page, 'Message');

    await expect(container).toBeVisible();
    await expect(websocket.message.body(0)).toBeVisible();

    // The scroll position must not have jumped to the bottom on remount.
    await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBe(0);
  });

  test('restores the scroll position when switching back to the Message tab', async ({
    pageWithUserData: page
  }) => {
    const { websocket } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, LONG_MSG_REQ);

    const container = websocket.message.container();
    await expect(container).toBeVisible();
    await expect(websocket.message.body(0)).toBeVisible();

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
    await expect(container).toBeHidden();
    await selectRequestPaneTab(page, 'Message');

    await expect(container).toBeVisible();
    await expect(websocket.message.body(0)).toBeVisible();

    // The scroll position must be restored to where we left off.
    await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBe(targetScroll);
  });

  test('restores both list and editor scroll at the bottom after switching tabs', async ({ pageWithUserData: page }) => {
    const { websocket } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, TWO_MSG_REQ);

    const container = websocket.message.container();
    const editorScroll = websocket.message.body(1).locator('.CodeMirror-scroll'); // message 2's tall editor
    // "At the bottom" = within a few px of the element's CURRENT max scroll
    // (the max can shift slightly across remounts, so don't compare to a fixed value).
    const atBottom = (locator: typeof container) =>
      locator.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop <= 8);

    await expect(container).toBeVisible();
    await expect(websocket.message.body(0)).toBeVisible();

    // Expand the second message too so the list is as tall as possible.
    await websocket.message.header(1).click({ position: { x: 8, y: 12 } });
    await expect(websocket.message.body(1)).toBeVisible();
    await expect.poll(() => container.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
    await expect.poll(() => editorScroll.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);

    // Wait for the open-scroll animation (scrollMessageToTop) to settle so it
    // doesn't override the scroll-to-bottom below (two equal reads in a row).
    let prevTop = -1;
    await expect
      .poll(async () => {
        const cur = await container.evaluate((el) => Math.round(el.scrollTop));
        const settled = cur === prevTop;
        prevTop = cur;
        return settled;
      })
      .toBe(true);

    // Scroll BOTH the inner editor and the outer list to the bottom.
    await editorScroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await container.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => atBottom(editorScroll)).toBe(true);
    await expect.poll(() => atBottom(container)).toBe(true);

    // Switch away from the Message tab and back — this remounts WsBody.
    await selectRequestPaneTab(page, 'Headers');
    await expect(container).toBeHidden();
    await selectRequestPaneTab(page, 'Message');

    await expect(container).toBeVisible();
    await expect(websocket.message.body(0)).toBeVisible();

    // Both scrolls must return to the bottom, not land short of it.
    await expect.poll(() => atBottom(container)).toBe(true);
    await expect.poll(() => atBottom(editorScroll)).toBe(true);
  });
});
