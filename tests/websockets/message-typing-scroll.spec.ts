import { expect, test } from '../../playwright';
import { openRequest, closeAllCollections } from '../utils/page/actions';

const COLLECTION_NAME = 'collection';
const SCROLL_REQ = 'ws-scroll-top';
const MULTI_REQ = 'ws-long-msg';

test.describe('websocket message editor typing scroll', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('typing does not jump the list to the end', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, SCROLL_REQ);

    const container = page.getByTestId('ws-messages-container');
    const body = page.getByTestId('ws-message-body-0');
    await expect(container).toBeVisible();
    await expect(body).toBeVisible();

    const cmScroll = body.locator('.CodeMirror-scroll');
    await expect
      .poll(() => cmScroll.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    // Scroll into the middle of the message body and place the cursor there.
    await cmScroll.evaluate((el) => {
      el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) / 2);
    });
    await body.locator('.CodeMirror').click();

    const containerBefore = await container.evaluate((el) => el.scrollTop);
    const cmBefore = await cmScroll.evaluate((el) => el.scrollTop);

    await page.keyboard.type('x');

    const containerAfter = await container.evaluate((el) => el.scrollTop);
    const cmAfter = await cmScroll.evaluate((el) => el.scrollTop);

    const listMoved = Math.abs(containerAfter - containerBefore);
    const editorMoved = Math.abs(cmAfter - cmBefore);

    // Typing on the same, already-visible line must not scroll anything.
    // The bug flung the list (and would fling the editor) to the very end;
    // healthy behaviour is zero movement (≤ 1px allows for fractional scrollTop).
    expect(listMoved).toBeLessThanOrEqual(1);
    expect(editorMoved).toBeLessThanOrEqual(1);
  });

  test('typing in the editor does not scroll the message list down', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, MULTI_REQ);

    const container = page.getByTestId('ws-messages-container');
    const body = page.getByTestId('ws-message-body-0');
    await expect(body).toBeVisible();

    // A long message + filler messages below make the list scrollable.
    await expect
      .poll(() => container.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    await body.locator('.CodeMirror').click();
    const listBefore = await container.evaluate((el) => el.scrollTop);

    await container.evaluate((el) => {
      const input = el.querySelector('.CodeMirror textarea') || el;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      el.scrollTop = el.scrollHeight; // browser-style fling to reveal the cursor
    });

    await expect
      .poll(() => container.evaluate((el) => el.scrollTop))
      .toBeLessThanOrEqual(listBefore + 1);
  });
});
