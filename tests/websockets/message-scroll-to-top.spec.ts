import { expect, test } from '../../playwright';
import { openRequest, closeAllCollections } from '../utils/page/actions';

const COLLECTION_NAME = 'collection';
const SCROLL_REQ = 'ws-scroll-top';

test.describe('websocket message list scroll to top on expand', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('reopening a message shows its body from the top', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, SCROLL_REQ);

    const container = page.getByTestId('ws-messages-container');
    const header = page.getByTestId('ws-message-header-0');
    const body = page.getByTestId('ws-message-body-0');
    const title = page.getByTestId('ws-message-label-0');

    await expect(container).toBeVisible();
    await expect(body).toBeVisible(); // expanded by default

    // How far the list is scrolled.
    const scrollTop = () => container.evaluate((el) => el.scrollTop);

    // The long message overflows the list, so there is room to scroll.
    await expect.poll(() => container.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);

    await test.step('clicking the title does not toggle or scroll; double click renames', async () => {
      await title.click();
      await expect(body).toBeVisible();

      await title.dblclick();
      await expect(page.getByTestId('ws-message-name-input-0')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('scroll into the body, collapse, then reopen returns to the top', async () => {
      // Scroll down into the message body.
      await container.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect.poll(scrollTop).toBeGreaterThan(0);

      // Collapse the message.
      await header.click({ position: { x: 8, y: 12 } });
      await expect(body).toBeHidden();

      // Reopen it — the body should be shown from line 1, not where we scrolled to.
      await header.click({ position: { x: 8, y: 12 } });
      await expect(body).toBeVisible();
      await expect.poll(scrollTop).toBe(0);
    });
  });
});
