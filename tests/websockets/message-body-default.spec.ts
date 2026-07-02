import { expect, test } from '../../playwright';
import { closeAllCollections } from '../utils/page/actions';

const REQ_NAME = /^ws-default-body-request$/;

test.describe('websocket message default body', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('a newly added message defaults to an empty body showing the placeholder', async ({
    pageWithUserData: page
  }) => {
    // Open the preloaded websocket request
    await page.getByTestId('sidebar-collection-row').click();
    await page.getByTitle(REQ_NAME).click();

    const headers = page.getByTestId(/^ws-message-header-/);
    const beforeCount = await headers.count();

    await page.getByTestId('ws-add-message').click();
    await expect(headers).toHaveCount(beforeCount + 1);

    // The newly added message is the last one and auto-expands.
    const newBody = page.getByTestId(`ws-message-body-${beforeCount}`);
    await expect(newBody).toBeVisible();

    const editor = newBody.locator('.CodeMirror');
    // Body should be empty (previously defaulted to '{}'); the editor should
    // surface the '...' placeholder instead of any '{}' content.
    await expect(editor.locator('.CodeMirror-placeholder')).toHaveText('...');
    await expect(editor.locator('.CodeMirror-code')).not.toContainText('{}');
  });
});
