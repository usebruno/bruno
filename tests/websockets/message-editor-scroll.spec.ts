import { expect, test } from '../../playwright';
import { openRequest, closeAllCollections } from '../utils/page/actions';

const COLLECTION_NAME = 'collection';
const SCROLL_REQ = 'ws-scroll-top';
const TWO_MSG_REQ = 'ws-two-long-msgs';

test.describe('websocket message editor scroll behaviour', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('reopening a message restores the scroll position where we left it', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, SCROLL_REQ);

    const header = page.getByTestId('ws-message-header-0');
    const body = page.getByTestId('ws-message-body-0');
    await expect(body).toBeVisible();

    const cmScroll = body.locator('.CodeMirror-scroll');
    await expect
      .poll(() => cmScroll.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    // Scroll down into the body.
    const target = await cmScroll.evaluate((el) => {
      el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) * 0.6);
      return el.scrollTop;
    });
    expect(target).toBeGreaterThan(0);

    // Collapse then reopen.
    await header.click({ position: { x: 8, y: 12 } });
    await expect(body).toBeHidden();
    await header.click({ position: { x: 8, y: 12 } });
    await expect(body).toBeVisible();

    // Editor should return to where we left it, not to the top.
    await expect
      .poll(() => page.getByTestId('ws-message-body-0').locator('.CodeMirror-scroll').evaluate((el) => el.scrollTop))
      .toBeGreaterThan(target - 60);
  });

  test('selecting another message does not reset the deselected editor scroll to top', async ({
    pageWithUserData: page
  }) => {
    await openRequest(page, COLLECTION_NAME, TWO_MSG_REQ);

    // Message 1 is selected + expanded by default.
    const firstBody = page.getByTestId('ws-message-body-0');
    await expect(firstBody).toBeVisible();

    const firstScroll = firstBody.locator('.CodeMirror-scroll');
    await expect
      .poll(() => firstScroll.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    // Scroll message 1's editor down into the body.
    const target = await firstScroll.evaluate((el) => {
      el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) * 0.6);
      return el.scrollTop;
    });
    expect(target).toBeGreaterThan(0);

    // Select message 2.
    await page.getByTestId('ws-message-header-1').click({ position: { x: 8, y: 12 } });

    // Message 1 stays expanded; its scroll must not have jumped to the top.
    await expect
      .poll(() => page.getByTestId('ws-message-body-0').locator('.CodeMirror-scroll').evaluate((el) => el.scrollTop))
      .toBeGreaterThan(target - 60);
  });
});
