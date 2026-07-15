import { expect, test } from '../../playwright';
import { closeAllTabs, createTransientRequest, selectRequestPaneTab } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';
import type { Locator } from '@playwright/test';

test.describe('websocket sticky header dropdown overlap', () => {
  test.afterEach(async ({ page }) => {
    await closeAllTabs(page);
  });

  // Returns true if the dropdown item is on top at its centre (not hidden behind a header).
  const topElementIsInsideDropdown = async (locator: Locator) => {
    const box = await locator.boundingBox();
    expect(box, 'dropdown item should have a layout box').not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    return locator.page().evaluate(
      ({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.tippy-box, .dropdown')),
      { x, y }
    );
  };

  test('body-mode dropdown of an upper message renders above the collapsed headers below it', async ({
    page
  }) => {
    const { websocket } = buildCommonLocators(page);

    await createTransientRequest(page, { requestType: 'WebSocket' });
    await selectRequestPaneTab(page, 'Message');

    // Build a list of several messages so an upper message's dropdown overlaps
    // the headers below it.
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

    // Open the first message's body-mode dropdown; its menu opens downward over
    // the collapsed headers below it.
    await websocket.message.bodyModeSelector(0).click();

    // The lowest item is the one most likely to overlap the header below, so it
    // is the strongest signal that the menu is not covered.
    const textItem = websocket.message.bodyModeItem('text');
    await expect(textItem).toBeVisible();

    // The item must be the topmost element at its own centre. Without the fix a
    // lower header paints over it and this resolves to the header instead.
    expect(await topElementIsInsideDropdown(textItem)).toBe(true);

    // It must also be clickable — Playwright's actionability check fails if the
    // item is obscured by a sticky header — and selecting it applies.
    await textItem.click();
    await expect(websocket.message.bodyModeLabel(0)).toContainText('TEXT');
  });
});
