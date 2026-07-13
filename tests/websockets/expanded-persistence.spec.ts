import { expect, test, Page } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';
import { createTransientRequest, selectRequestPaneTab, closeAllTabs } from '../utils/page/actions';

// Switch to an already-open request tab by its label (transient tabs are "Untitled N").
const switchToTab = async (page: Page, label: string) => {
  const tab = page.getByTestId('request-tab').filter({ hasText: label });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
};

test.describe('websocket expanded-message persistence across tab switches', () => {
  test.afterEach(async ({ page }) => {
    await closeAllTabs(page);
  });

  test('keeps every open message open (not just the selected one) after switching tabs and back', async ({
    page
  }) => {
    const ws = buildWebsocketCommonLocators(page);

    // Tab A: a WebSocket request with two messages, both expanded.
    await createTransientRequest(page, { requestType: 'WebSocket' });
    await selectRequestPaneTab(page, 'Message');
    await expect(ws.message.body(0)).toBeVisible();

    // Adding a second message auto-expands it (and selects it), so both are open.
    await ws.message.addButton().click();
    await expect(ws.message.headers()).toHaveCount(2);
    await expect(ws.message.body(0)).toBeVisible();
    await expect(ws.message.body(1)).toBeVisible();

    // Tab B: another request to switch to, unmounting tab A's message list.
    await createTransientRequest(page, { requestType: 'WebSocket' });

    // Back to tab A.
    await switchToTab(page, 'Untitled 1');
    await selectRequestPaneTab(page, 'Message');

    // Both messages must remain expanded — previously only the selected message
    // was restored on remount and the rest collapsed.
    await expect(ws.message.body(0)).toBeVisible();
    await expect(ws.message.body(1)).toBeVisible();
  });
});
