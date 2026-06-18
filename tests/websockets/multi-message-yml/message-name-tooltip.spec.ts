import { expect, test } from '../../../playwright';
import { openRequest, closeAllCollections, renameWsMessage } from '../../utils/page/actions';
import { buildWebsocketCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'ws-multi-message-yml';
const SINGLE_MSG_REQ = 'ws-single-msg';

const LONG_NAME
  = 'this is a very long websocket message name that should be truncated with an ellipsis';

test.describe('websocket message name tooltip (yml format)', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('shows the full name in a tooltip on hover', async ({
    pageWithUserData: page
  }) => {
    const ws = buildWebsocketCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    const messageLabel = ws.message.label(0);
    const tooltip = ws.message.nameTooltip();

    await test.step('short name → tooltip shows the name on hover', async () => {
      await renameWsMessage(page, 0, 'hi');
      await expect(messageLabel).toHaveText('hi');

      await messageLabel.hover();
      await expect(tooltip).toBeVisible({ timeout: 15000 });
      await expect(tooltip).toContainText('hi');
    });

    await test.step('long name → label is truncated and tooltip reveals the full name', async () => {
      await renameWsMessage(page, 0, LONG_NAME);
      await expect(messageLabel).toHaveText(LONG_NAME);
      // the label itself is clipped with an ellipsis...
      await expect(messageLabel).toHaveCSS('text-overflow', 'ellipsis');

      // ...and hovering surfaces the full name in the tooltip
      await messageLabel.hover();
      await expect(tooltip).toBeVisible({ timeout: 15000 });
      await expect(tooltip).toContainText(LONG_NAME);
    });
  });
});
