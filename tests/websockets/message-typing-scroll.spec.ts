import { expect, test } from '../../playwright';
import { openRequest, closeAllCollections } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

const COLLECTION_NAME = 'collection';
const SCROLL_REQ = 'ws-scroll-top';

test.describe('websocket message editor typing scroll', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('typing does not jump the list to the end', async ({ pageWithUserData: page }) => {
    const { websocket } = buildCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, SCROLL_REQ);

    const container = websocket.message.container();
    const body = websocket.message.body(0);
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
    await websocket.message.editor(0).click();

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
});
