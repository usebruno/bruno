import { expect, test } from '../../playwright';
import { buildCommonLocators } from '../utils/page/locators';
import { createTransientRequest, selectRequestPaneTab, closeAllTabs } from '../utils/page/actions';

test.describe('websocket message header selection on delete', () => {
  test.afterEach(async ({ page }) => {
    await closeAllTabs(page);
  });

  test('deleting an unselected message keeps the current selection (does not jump to first)', async ({
    page
  }) => {
    const { websocket } = buildCommonLocators(page);

    await test.step('Create a WebSocket request with three messages', async () => {
      await createTransientRequest(page, { requestType: 'WebSocket' });
      await selectRequestPaneTab(page, 'Message');

      for (let i = 0; i < 2; i++) {
        await websocket.message.addButton().click();
        await websocket.message.nameInput(i + 1).press('Escape');
      }
      await expect(websocket.message.headers()).toHaveCount(3);
    });

    await test.step('The last-added message (index 2) is the selected one', async () => {
      await expect(websocket.message.messageWrapper(2)).not.toHaveClass(/disabled/);
      await expect(websocket.message.messageWrapper(0)).toHaveClass(/disabled/);
    });

    await test.step('Delete a different, unselected message (the first one)', async () => {
      await websocket.message.header(0).hover();
      await websocket.message.deleteButton(0).click();
      await expect(websocket.message.headers()).toHaveCount(2);
    });

    await test.step('The previously selected message stays selected — not the first', async () => {
      // It has shifted from index 2 to index 1 after the delete.
      await expect(websocket.message.messageWrapper(1)).not.toHaveClass(/disabled/);
      await expect(websocket.message.messageWrapper(0)).toHaveClass(/disabled/);
    });
  });

  test('clicking a message (not its delete button) still selects it', async ({ page }) => {
    const { websocket } = buildCommonLocators(page);

    await test.step('Create a WebSocket request with two messages', async () => {
      await createTransientRequest(page, { requestType: 'WebSocket' });
      await selectRequestPaneTab(page, 'Message');

      await websocket.message.addButton().click();
      await websocket.message.nameInput(1).press('Escape');
      await expect(websocket.message.headers()).toHaveCount(2);
    });

    await test.step('The newly added message (index 1) is selected', async () => {
      await expect(websocket.message.messageWrapper(1)).not.toHaveClass(/disabled/);
      await expect(websocket.message.messageWrapper(0)).toHaveClass(/disabled/);
    });

    await test.step('Clicking the first message header selects it', async () => {
      // Only the delete button is exempt from selecting the row.
      await websocket.message.header(0).click();
      await expect(websocket.message.messageWrapper(0)).not.toHaveClass(/disabled/);
      await expect(websocket.message.messageWrapper(1)).toHaveClass(/disabled/);
    });
  });
});
