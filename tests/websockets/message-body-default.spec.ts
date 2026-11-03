import { expect, test } from '../../playwright';
import { closeAllTabs, createTransientRequest, selectRequestPaneTab } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('websocket message default body', () => {
  test.afterEach(async ({ page }) => {
    await closeAllTabs(page);
  });

  test('a newly added message defaults to an empty body showing the placeholder', async ({
    page
  }) => {
    const { websocket } = buildCommonLocators(page);

    await createTransientRequest(page, { requestType: 'WebSocket' });
    await selectRequestPaneTab(page, 'Message');

    const beforeCount = await websocket.message.headers().count();

    await websocket.message.addButton().click();
    await expect(websocket.message.headers()).toHaveCount(beforeCount + 1);

    // The newly added message is the last one and auto-expands.
    await expect(websocket.message.body(beforeCount)).toBeVisible();

    // Body should be empty (previously defaulted to '{}'); the editor should
    // surface the '...' placeholder instead of any '{}' content.
    await expect(websocket.message.editorPlaceholder(beforeCount)).toHaveText('...');
    await expect(websocket.message.editorCode(beforeCount)).not.toContainText('{}');
  });

  test('the default first message of a newly created websocket request has an empty body', async ({
    page
  }) => {
    const { websocket } = buildCommonLocators(page);

    await createTransientRequest(page, { requestType: 'WebSocket' });
    await selectRequestPaneTab(page, 'Message');

    // The default first message auto-expands.
    await expect(websocket.message.body(0)).toBeVisible();

    // Body must be empty (previously defaulted to '{}'); the editor should surface
    // the '...' placeholder rather than any '{}' content.
    await expect(websocket.message.editorPlaceholder(0)).toHaveText('...');
    await expect(websocket.message.editorCode(0)).not.toContainText('{}');
  });
});
