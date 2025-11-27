import { test, expect } from '../../../playwright';
import { buildWebsocketCommonLocators } from '../../utils/page/locators';
import { closeAllCollections, openCollectionAndAcceptSandbox } from '../../utils/page';

const BRU_REQ_NAME = /^ws-interpolation-test$/;
const MAX_CONNECTION_TIME = 10000; // Increased timeout for external server

test.describe.serial('WebSocket Variable Interpolation', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('interpolates variables in WebSocket URL', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Open the collection and accept sandbox modal if it appears
    await openCollectionAndAcceptSandbox(page, 'variable-interpolation', 'safe');

    // Open the request
    await expect(page.getByTitle(BRU_REQ_NAME)).toBeVisible();
    await page.getByTitle(BRU_REQ_NAME).click();

    // Select the test environment (which has url: websocket)
    await page.locator('div.current-environment').click();
    await expect(page.locator('.dropdown-item').filter({ hasText: 'Test' })).toBeVisible();
    await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();
    await expect(page.locator('.current-environment').filter({ hasText: /Test/ })).toBeVisible();

    // Wait a bit for environment to be applied
    await page.waitForTimeout(200);

    // Connect WebSocket
    await locators.connectionControls.connect().click();

    // Wait for connection to establish
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    // Verify the connection message shows interpolated URL
    // The URL should be wss://echo.websocket.org (not wss://echo.{{url}}.org)
    await expect(locators.messages().first().getByText(/Connected to wss:\/\/echo\.websocket\.org/)).toBeAttached({
      timeout: 2000
    });
  });

  test('interpolates variables in WebSocket message content', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Wait for collection to be visible (it should auto-load from preferences)
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'variable-interpolation' })).toBeVisible({ timeout: 5000 });

    // Check if sandbox modal is present and handle it
    const sandboxModal = page.locator('.bruno-modal-card').filter({ has: page.locator('.bruno-modal-header-title', { hasText: 'JavaScript Sandbox' }) });
    const isModalVisible = await sandboxModal.isVisible().catch(() => false);

    if (isModalVisible) {
      // Accept sandbox modal
      await sandboxModal.getByLabel('Safe Mode').check();
      await sandboxModal.locator('.bruno-modal-footer .submit').click();
      await sandboxModal.waitFor({ state: 'detached' });
    } else {
      // Collection might already be open, just ensure it's clicked
      await page.locator('#sidebar-collection-name').filter({ hasText: 'variable-interpolation' }).click();
    }

    // Wait a bit for any modals to fully close
    await page.waitForTimeout(300);

    // Open the request
    await expect(page.getByTitle(BRU_REQ_NAME)).toBeVisible();
    await page.getByTitle(BRU_REQ_NAME).click();

    // Select the test environment (which has data: test-data)
    await page.locator('div.current-environment').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();

    // Clear any previous messages
    await locators.toolbar.clearResponse().click();

    // Send the request (connect + send messages)
    await locators.runner().click();

    // Wait for connection
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });

    // Wait a bit for messages to be sent and received (echo server echoes back)
    await page.waitForTimeout(1000);

    // Verify the sent message contains interpolated value
    // Should send {"test": "test-data"} (not {"test": "{{data}}"})
    const messages = locators.messages();

    // Find the outgoing message with interpolated content
    // The echo server will echo back the same message, so we should see it twice
    const sentMessage = messages.filter({ hasText: 'test-data' }).first();
    await expect(sentMessage).toBeAttached({ timeout: 2000 });

    // Verify the message content shows interpolated value, not literal variable
    const messageText = await sentMessage.locator('.text-ellipsis').textContent();
    expect(messageText).toContain('test-data');
    expect(messageText).not.toContain('{{data}}');

    // Verify JSON structure is correct
    expect(messageText).toMatch(/\{[\s\S]*"test"[\s\S]*"test-data"[\s\S]*\}/);
  });
});
