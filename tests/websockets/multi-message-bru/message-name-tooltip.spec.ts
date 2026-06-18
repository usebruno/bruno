import { expect, test } from '../../../playwright';
import { openRequest, closeAllCollections, renameWsMessage } from '../../utils/page/actions';
import { buildWebsocketCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'ws-multi-message';
const SINGLE_MSG_REQ = 'ws-single-msg';

const LONG_NAME
  = 'this is a very long websocket message name that should be truncated with an ellipsis';

test.describe('websocket message name tooltip', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('shows the full name on hover only when the label is truncated', async ({
    pageWithUserData: page
  }) => {
    const ws = buildWebsocketCommonLocators(page);
    await openRequest(page, COLLECTION_NAME, SINGLE_MSG_REQ);

    const messageLabel = ws.message.label(0);
    const tooltip = ws.message.nameTooltip();

    await test.step('short name that fits → no tooltip on hover', async () => {
      await renameWsMessage(page, 0, 'hi');
      await expect(messageLabel).toHaveText('hi');

      // a short name fits, so it isn't truncated — the "only when truncated" gate stays off
      await expect
        .poll(() => messageLabel.evaluate((el) => el.scrollWidth > el.clientWidth))
        .toBe(false);

      await messageLabel.hover();
      await expect(tooltip).toHaveCount(0);
    });

    await test.step('long, truncated name → tooltip reveals the full name', async () => {
      await renameWsMessage(page, 0, LONG_NAME);
      await expect(messageLabel).toHaveText(LONG_NAME);
      // the label itself is clipped with an ellipsis...
      await expect(messageLabel).toHaveCSS('text-overflow', 'ellipsis');

      // ...but hovering surfaces the full name in the tooltip
      await messageLabel.hover();
      await expect(tooltip).toBeVisible({ timeout: 15000 });
      await expect(tooltip).toContainText(LONG_NAME);
    });
  });
});
