import { expect, test } from '../../playwright';
import { buildCommonLocators } from '../utils/page/locators';
import { createTransientRequest, selectRequestPaneTab, closeAllTabs, switchToOpenTab } from '../utils/page/actions';

test.describe('websocket expanded-message persistence across tab switches', () => {
  test.afterEach(async ({ page }) => {
    await closeAllTabs(page);
  });

  test('keeps every open message open (not just the selected one) after switching tabs and back', async ({
    page
  }) => {
    const { websocket } = buildCommonLocators(page);

    // Tab A: a WebSocket request with two messages, both expanded.
    await createTransientRequest(page, { requestType: 'WebSocket' });
    await selectRequestPaneTab(page, 'Message');
    await expect(websocket.message.body(0)).toBeVisible();

    // Adding a second message auto-expands it (and selects it), so both are open.
    await websocket.message.addButton().click();
    await expect(websocket.message.headers()).toHaveCount(2);
    await expect(websocket.message.body(0)).toBeVisible();
    await expect(websocket.message.body(1)).toBeVisible();

    // Tab B: another request to switch to, unmounting tab A's message list.
    await createTransientRequest(page, { requestType: 'WebSocket' });

    // Back to tab A.
    await switchToOpenTab(page, 'Untitled 1');
    await selectRequestPaneTab(page, 'Message');

    // Both messages must remain expanded — previously only the selected message
    // was restored on remount and the rest collapsed.
    await expect(websocket.message.body(0)).toBeVisible();
    await expect(websocket.message.body(1)).toBeVisible();
  });
});
