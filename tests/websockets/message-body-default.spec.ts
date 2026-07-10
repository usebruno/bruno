import { expect, test } from '../../playwright';
import { closeAllTabs, createTransientRequest, selectRequestPaneTab } from '../utils/page/actions';
import { buildWebsocketCommonLocators } from '../utils/page/locators';

test.describe('websocket message default body', () => {
  test.afterEach(async ({ page }) => {
    await closeAllTabs(page);
  });

  test('a newly added message defaults to an empty body showing the placeholder', async ({
    page
  }) => {
    const ws = buildWebsocketCommonLocators(page);

    await createTransientRequest(page, { requestType: 'WebSocket' });
    await selectRequestPaneTab(page, 'Message');

    const beforeCount = await ws.message.headers().count();

    await ws.message.addButton().click();
    await expect(ws.message.headers()).toHaveCount(beforeCount + 1);

    // The newly added message is the last one and auto-expands.
    const newBody = ws.message.body(beforeCount);
    await expect(newBody).toBeVisible();

    const editor = newBody.locator('.CodeMirror');
    // Body should be empty (previously defaulted to '{}'); the editor should
    // surface the '...' placeholder instead of any '{}' content.
    await expect(editor.locator('.CodeMirror-placeholder')).toHaveText('...');
    await expect(editor.locator('.CodeMirror-code')).not.toContainText('{}');
  });

  test('the default first message of a newly created websocket request has an empty body', async ({
    page
  }) => {
    const ws = buildWebsocketCommonLocators(page);

    await createTransientRequest(page, { requestType: 'WebSocket' });
    await selectRequestPaneTab(page, 'Message');

    // The default first message auto-expands.
    const body = ws.message.body(0);
    await expect(body).toBeVisible();

    const editor = body.locator('.CodeMirror');
    // Body must be empty (previously defaulted to '{}'); the editor should surface
    // the '...' placeholder rather than any '{}' content.
    await expect(editor.locator('.CodeMirror-placeholder')).toHaveText('...');
    await expect(editor.locator('.CodeMirror-code')).not.toContainText('{}');
  });
});
