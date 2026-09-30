import { expect, test } from '../../playwright';
import { closeAllTabs, createTransientRequest, elementIsInsideDropdown, selectRequestPaneTab } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('websocket sticky header dropdown overlap', () => {
  test.afterEach(async ({ page }) => {
    await closeAllTabs(page);
  });

  test('body-mode dropdown of an upper message renders above the collapsed headers below it', async ({
    page
  }) => {
    const { websocket } = buildCommonLocators(page);

    await test.step('Open a websocket request with several collapsed messages', async () => {
      await createTransientRequest(page, { requestType: 'WebSocket' });
      await selectRequestPaneTab(page, 'Message');

      await expect(websocket.message.headers()).toHaveCount(1);
      for (let i = 0; i < 3; i++) {
        const before = await websocket.message.headers().count();
        await websocket.message.addButton().click();
        await expect(websocket.message.headers()).toHaveCount(before + 1);
      }

      const total = await websocket.message.headers().count();
      expect(total).toBeGreaterThanOrEqual(4);

      // Collapse every message so all accordions are closed.
      for (let i = 0; i < total; i++) {
        if (await websocket.message.body(i).isVisible()) {
          await websocket.message.header(i).click();
        }
      }
      for (let i = 0; i < total; i++) {
        await expect(websocket.message.body(i)).toBeHidden();
      }
    });

    const textItem = websocket.message.bodyModeItem('text');

    await test.step('Open the first message dropdown over the headers below', async () => {
      await websocket.message.bodyModeSelector(0).click();

      // The lowest item is the one most likely to overlap the header below, so
      // it is the strongest signal that the menu is not covered.
      await expect(textItem).toBeVisible();

      // The item must be the topmost element at its own centre. Without the fix
      // a lower header paints over it and this resolves to the header instead.
      expect(await elementIsInsideDropdown(textItem)).toBe(true);
    });

    await test.step('Select the item and verify it applies', async () => {
      // Playwright's actionability check fails if the item is obscured.
      await textItem.click();
      await expect(websocket.message.bodyModeLabel(0)).toContainText('TEXT');
    });
  });

  test('open dropdown stays on top when a lower message header is hovered', async ({
    page
  }) => {
    const { websocket } = buildCommonLocators(page);
    let total = 0;

    await test.step('Open a websocket request with several collapsed messages', async () => {
      await createTransientRequest(page, { requestType: 'WebSocket' });
      await selectRequestPaneTab(page, 'Message');

      await expect(websocket.message.headers()).toHaveCount(1);
      for (let i = 0; i < 3; i++) {
        const before = await websocket.message.headers().count();
        await websocket.message.addButton().click();
        await expect(websocket.message.headers()).toHaveCount(before + 1);
      }

      total = await websocket.message.headers().count();
      expect(total).toBeGreaterThanOrEqual(4);

      // Collapse every message so all accordions are closed.
      for (let i = 0; i < total; i++) {
        if (await websocket.message.body(i).isVisible()) {
          await websocket.message.header(i).click();
        }
      }
      for (let i = 0; i < total; i++) {
        await expect(websocket.message.body(i)).toBeHidden();
      }
    });

    const textItem = websocket.message.bodyModeItem('text');

    await test.step('Open the first message dropdown, then hover a header below it', async () => {
      // The dropdown renders in a portal (appendTo document.body), so hovering a
      // lower header must not raise that header over the open menu.
      await websocket.message.bodyModeSelector(0).click();
      await expect(textItem).toBeVisible();

      // Hover the last message's header — the one furthest under the open menu.
      await websocket.message.header(total - 1).hover();
    });

    await test.step('Dropdown stays on top and is still clickable', async () => {
      expect(await elementIsInsideDropdown(textItem)).toBe(true);
      await textItem.click();
      await expect(websocket.message.bodyModeLabel(0)).toContainText('TEXT');
    });
  });
});
