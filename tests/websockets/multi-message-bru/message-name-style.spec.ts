import { expect, test } from '../../../playwright';
import { openRequest, closeAllCollections } from '../../utils/page/actions';

const COLLECTION_NAME = 'ws-multi-message';
const SINGLE_MSG_REQ = 'ws-single-msg';

test.describe('websocket message name styling', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('editable message name uses the text (I-beam) cursor', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    await expect(page.getByTestId('ws-message-label-0')).toHaveCSS('cursor', 'text');
  });

  test('long message name truncates instead of overflowing', async ({ pageWithUserData: page }) => {
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    const longName = 'this is a very long websocket message name that should be truncated with an ellipsis';

    // Rename the message to a name far wider than the row
    await page.getByTestId('ws-message-label-0').dblclick();
    const nameInput = page.getByTestId('ws-message-name-input-0');
    await expect(nameInput).toBeVisible();
    await nameInput.selectText();
    await page.keyboard.type(longName);
    await nameInput.press('Enter');

    const messageLabel = page.getByTestId('ws-message-label-0').filter({ hasText: longName });
    await expect(messageLabel).toBeVisible();
    await expect(messageLabel).toHaveCSS('white-space', 'nowrap');
    await expect(messageLabel).toHaveCSS('text-overflow', 'ellipsis');
  });
});
