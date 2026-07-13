import { expect, test } from '../../playwright';
import { openRequest, closeAllCollections } from '../utils/page/actions';
import { buildWebsocketCommonLocators } from '../utils/page/locators';

const COLLECTION_NAME = 'collection';
const SCROLL_REQ = 'ws-scroll-top';
const TWO_MSG_REQ = 'ws-two-long-msgs';

test.describe('websocket message editor scroll behaviour', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('reopening a message restores the scroll position where we left it', async ({ pageWithUserData: page }) => {
    const ws = buildWebsocketCommonLocators(page);
    // CodeMirror's scroller lives inside the message body.
    const cmScroll = (index: number) => ws.message.body(index).locator('.CodeMirror-scroll');

    await openRequest(page, COLLECTION_NAME, SCROLL_REQ);

    await expect(ws.message.body(0)).toBeVisible();

    await expect
      .poll(() => cmScroll(0).evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    // Scroll down into the body.
    const target = await cmScroll(0).evaluate((el) => {
      el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) * 0.6);
      return el.scrollTop;
    });
    expect(target).toBeGreaterThan(0);

    // Collapse then reopen.
    await ws.message.header(0).click({ position: { x: 8, y: 12 } });
    await expect(ws.message.body(0)).toBeHidden();
    await ws.message.header(0).click({ position: { x: 8, y: 12 } });
    await expect(ws.message.body(0)).toBeVisible();

    // Editor should return to where we left it, not to the top.
    await expect
      .poll(() => cmScroll(0).evaluate((el) => el.scrollTop))
      .toBeGreaterThan(target - 60);
  });

  test('selecting another message does not reset the deselected editor scroll to top', async ({
    pageWithUserData: page
  }) => {
    const ws = buildWebsocketCommonLocators(page);
    const cmScroll = (index: number) => ws.message.body(index).locator('.CodeMirror-scroll');

    await openRequest(page, COLLECTION_NAME, TWO_MSG_REQ);

    // Message 1 is selected + expanded by default.
    await expect(ws.message.body(0)).toBeVisible();

    await expect
      .poll(() => cmScroll(0).evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    // Scroll message 1's editor down into the body.
    const target = await cmScroll(0).evaluate((el) => {
      el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) * 0.6);
      return el.scrollTop;
    });
    expect(target).toBeGreaterThan(0);

    // Select message 2.
    await ws.message.header(1).click({ position: { x: 8, y: 12 } });

    // Message 1 stays expanded; its scroll must not have jumped to the top.
    await expect
      .poll(() => cmScroll(0).evaluate((el) => el.scrollTop))
      .toBeGreaterThan(target - 60);
  });
});
