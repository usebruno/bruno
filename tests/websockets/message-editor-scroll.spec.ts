import { expect, test } from '../../playwright';
import { openRequest, closeAllCollections } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

const COLLECTION_NAME = 'collection';
const SCROLL_REQ = 'ws-scroll-top';
const TWO_MSG_REQ = 'ws-two-long-msgs';

test.describe('websocket message editor scroll behaviour', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('reopening a message restores the scroll position where we left it', async ({ pageWithUserData: page }) => {
    const { websocket } = buildCommonLocators(page);
    // CodeMirror's scroller lives inside the message body.
    const cmScroll = (index: number) => websocket.message.body(index).locator('.CodeMirror-scroll');

    await openRequest(page, COLLECTION_NAME, SCROLL_REQ);

    await expect(websocket.message.body(0)).toBeVisible();

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
    await websocket.message.header(0).click({ position: { x: 8, y: 12 } });
    await expect(websocket.message.body(0)).toBeHidden();
    await websocket.message.header(0).click({ position: { x: 8, y: 12 } });
    await expect(websocket.message.body(0)).toBeVisible();

    // Editor should return to where we left it, not to the top.
    await expect
      .poll(() => cmScroll(0).evaluate((el) => el.scrollTop))
      .toBeGreaterThan(target - 60);
  });

  test('opening a collapsed message scrolls its header to the top of the list', async ({
    pageWithUserData: page
  }) => {
    const { websocket } = buildCommonLocators(page);
    const container = websocket.message.container();

    await openRequest(page, COLLECTION_NAME, TWO_MSG_REQ);

    // Message 1 is expanded by default; message 2 starts collapsed and below it.
    await expect(websocket.message.body(0)).toBeVisible();
    await expect(websocket.message.body(1)).toHaveCount(0);

    // Start from the top of the list so message 2 is below the fold.
    await container.evaluate((el) => {
      el.scrollTop = 0;
    });

    // Open message 2.
    await websocket.message.header(1).click({ position: { x: 8, y: 12 } });
    await expect(websocket.message.body(1)).toBeVisible();

    // Its (sticky) header should settle at the top of the list — i.e. the message
    // wrapper's top aligns with the container's top.
    await expect
      .poll(() =>
        container.evaluate((el) => {
          const header = el.querySelector('[data-testid="ws-message-header-1"]');
          const wrapper = header?.parentElement;
          if (!wrapper) return Number.MAX_SAFE_INTEGER;
          return Math.round(wrapper.getBoundingClientRect().top - el.getBoundingClientRect().top);
        })
      )
      .toBeLessThanOrEqual(4);
  });

  test('selecting another message does not reset the deselected editor scroll to top', async ({
    pageWithUserData: page
  }) => {
    const { websocket } = buildCommonLocators(page);
    const cmScroll = (index: number) => websocket.message.body(index).locator('.CodeMirror-scroll');

    await openRequest(page, COLLECTION_NAME, TWO_MSG_REQ);

    // Message 1 is selected + expanded by default.
    await expect(websocket.message.body(0)).toBeVisible();

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
    await websocket.message.header(1).click({ position: { x: 8, y: 12 } });

    // Message 1 stays expanded; its scroll must not have jumped to the top.
    await expect
      .poll(() => cmScroll(0).evaluate((el) => el.scrollTop))
      .toBeGreaterThan(target - 60);
  });

  test('clicking a reopened message body does not move the scroll position', async ({ pageWithUserData: page }) => {
    const { websocket } = buildCommonLocators(page);
    const container = websocket.message.container();
    const cmScroll = (index: number) => websocket.message.body(index).locator('.CodeMirror-scroll');

    await openRequest(page, COLLECTION_NAME, TWO_MSG_REQ);
    await expect(websocket.message.body(0)).toBeVisible();

    // Open message 2 so both messages are expanded.
    await websocket.message.header(1).click({ position: { x: 8, y: 12 } });
    await expect(websocket.message.body(1)).toBeVisible();

    // Go to the top of the list.
    await container.evaluate((el) => { el.scrollTop = 0; });

    // Close message 1, then open it again.
    await websocket.message.header(0).click({ position: { x: 8, y: 12 } });
    await expect(websocket.message.body(0)).toBeHidden();
    await websocket.message.header(0).click({ position: { x: 8, y: 12 } });
    await expect(websocket.message.body(0)).toBeVisible();

    // Wait for any open-scroll animation to settle, then record the positions.
    const listBefore = await container.evaluate((el) => Math.round(el.scrollTop));
    const cmBefore = await cmScroll(0).evaluate((el) => Math.round(el.scrollTop));

    // Click on the message body.
    await websocket.message.editor(0).click();

    // The position must be the same after clicking.
    const listAfter = await container.evaluate((el) => Math.round(el.scrollTop));
    const cmAfter = await cmScroll(0).evaluate((el) => Math.round(el.scrollTop));

    expect(Math.abs(listAfter - listBefore)).toBeLessThanOrEqual(4);
    expect(Math.abs(cmAfter - cmBefore)).toBeLessThanOrEqual(4);
  });
});
