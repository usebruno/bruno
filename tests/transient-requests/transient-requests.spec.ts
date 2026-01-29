import { test, expect } from '../../playwright';
import { createTransientRequest, fillRequestUrl, closeAllCollections, createCollection, sendRequest, clickResponseAction, selectRequestPaneTab } from '../utils/page';
import { buildCommonLocators, buildWebsocketCommonLocators } from '../utils/page/locators';

test.describe.serial('Transient Requests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeAll(async ({ page, createTmpDir }) => {
    locators = buildCommonLocators(page);

    // Create a temporary collection
    const collectionPath = await createTmpDir('transient-collection');
    await createCollection(page, 'transient-requests-test', collectionPath);

    // Verify the collection is loaded
    await test.step('Verify test collection is loaded', async () => {
      await expect(locators.sidebar.collection('transient-requests-test')).toBeVisible();
      await locators.sidebar.collection('transient-requests-test').click();
    });
  });

  test.afterAll(async ({ page }) => {
    // Clean up all collections
    await closeAllCollections(page);
  });

  test('Create transient HTTP request - should not appear in sidebar', async ({ page }) => {
    await test.step('Create transient HTTP request', async () => {
      await createTransientRequest(page, {
        requestType: 'HTTP'
      });
      await fillRequestUrl(page, 'http://localhost:8081/ping');
    });

    await test.step('Verify HTTP request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });

    await test.step('Verify request is NOT in sidebar', async () => {
      // Click on the collection to ensure it's expanded
      await locators.sidebar.collection('transient-requests-test').click();
      await page.waitForTimeout(300);

      // Check that there are no requests in the collection
      // Transient requests should not appear in the sidebar
      const collectionItems = page.locator('.collection-item-name');
      await expect(collectionItems).toHaveCount(0);
    });
  });

  test('Create transient GraphQL request - should not appear in sidebar', async ({ page }) => {
    await test.step('Create transient GraphQL request', async () => {
      await createTransientRequest(page, {
        requestType: 'GraphQL'
      });
      await fillRequestUrl(page, 'https://api.example.com/graphql');
    });

    await test.step('Verify GraphQL request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });

    await test.step('Verify request is NOT in sidebar', async () => {
      // Check that there are still no requests in the collection
      const collectionItems = page.locator('.collection-item-name');
      await expect(collectionItems).toHaveCount(0);
    });
  });

  test('Create transient gRPC request - should not appear in sidebar', async ({ page }) => {
    await test.step('Create transient gRPC request', async () => {
      await createTransientRequest(page, {
        requestType: 'gRPC'
      });
      await fillRequestUrl(page, 'grpc://localhost:50051');
    });

    await test.step('Verify gRPC request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });

    await test.step('Verify request is NOT in sidebar', async () => {
      // Check that there are still no requests in the collection
      const collectionItems = page.locator('.collection-item-name');
      await expect(collectionItems).toHaveCount(0);
    });
  });

  test('Create transient WebSocket request - should not appear in sidebar', async ({ page }) => {
    await test.step('Create transient WebSocket request', async () => {
      await createTransientRequest(page, {
        requestType: 'WebSocket'
      });
      await fillRequestUrl(page, 'ws://localhost:8082');
    });

    await test.step('Verify WebSocket request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });

    await test.step('Verify request is NOT in sidebar', async () => {
      // Check that there are still no requests in the collection
      const collectionItems = page.locator('.collection-item-name');
      await expect(collectionItems).toHaveCount(0);
    });
  });

  test('Save transient HTTP request - should appear in sidebar after save', async ({ page }) => {
    await test.step('Create transient HTTP request', async () => {
      await createTransientRequest(page, {
        requestType: 'HTTP'
      });
      await fillRequestUrl(page, 'http://localhost:8081/echo');
    });

    await test.step('Trigger save action using keyboard shortcut', async () => {
      // Try to save using Cmd+S (Mac) or Ctrl+S (other platforms)
      await page.keyboard.press('Meta+s');
      await page.waitForTimeout(500);
    });

    await test.step('Fill in save dialog', async () => {
      // Wait for save modal to appear
      const saveModal = page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' });
      await expect(saveModal).toBeVisible({ timeout: 5000 });

      // Fill in request name
      const requestNameInput = saveModal.locator('#request-name');
      await requestNameInput.clear();
      await requestNameInput.fill('Saved HTTP Request');

      // Click Save button
      await saveModal.getByRole('button', { name: 'Save' }).click();

      // Wait for success toast
      await page.waitForTimeout(1000);
    });

    await test.step('Verify saved request appears in sidebar', async () => {
      // Check collection is expanded
      await locators.sidebar.collection('transient-requests-test').click();

      // Look for the saved request in sidebar
      const savedRequest = locators.sidebar.request('Saved HTTP Request');
      await expect(savedRequest).toBeVisible();
    });

    await test.step('Cleanup: Delete the saved request', async () => {
      await locators.sidebar.request('Saved HTTP Request').hover();
      await locators.actions.collectionItemActions('Saved HTTP Request').click();
      await locators.dropdown.item('Delete').click();
      await locators.modal.button('Delete').click();
      await expect(locators.sidebar.request('Saved HTTP Request')).not.toBeVisible();
    });
  });

  test('Save transient GraphQL request - should appear in sidebar after save', async ({ page }) => {
    await test.step('Create transient GraphQL request', async () => {
      await createTransientRequest(page, {
        requestType: 'GraphQL'
      });
      await fillRequestUrl(page, 'https://api.example.com/graphql');
    });

    await test.step('Trigger save action using keyboard shortcut', async () => {
      await page.keyboard.press('Meta+s');
      await page.waitForTimeout(500);
    });

    await test.step('Fill in save dialog', async () => {
      const saveModal = page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' });
      await expect(saveModal).toBeVisible({ timeout: 5000 });

      const requestNameInput = saveModal.locator('#request-name');
      await requestNameInput.clear();
      await requestNameInput.fill('Saved GraphQL Request');

      await saveModal.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(1000);
    });

    await test.step('Verify saved request appears in sidebar', async () => {
      await locators.sidebar.collection('transient-requests-test').click();
      const savedRequest = locators.sidebar.request('Saved GraphQL Request');
      await expect(savedRequest).toBeVisible();
    });

    await test.step('Cleanup: Delete the saved request', async () => {
      await locators.sidebar.request('Saved GraphQL Request').hover();
      await locators.actions.collectionItemActions('Saved GraphQL Request').click();
      await locators.dropdown.item('Delete').click();
      await locators.modal.button('Delete').click();
      await expect(locators.sidebar.request('Saved GraphQL Request')).not.toBeVisible();
    });
  });

  test('Send transient HTTP request - verify response', async ({ page }) => {
    await test.step('Create transient HTTP request', async () => {
      await createTransientRequest(page, {
        requestType: 'HTTP'
      });
      await fillRequestUrl(page, 'http://localhost:8081/ping');
    });

    await test.step('Send request and verify response', async () => {
      // Send request using the helper function
      await sendRequest(page, 200);

      // Copy response to clipboard and verify
      await clickResponseAction(page, 'response-copy-btn');
      await expect(page.getByText('Response copied to clipboard')).toBeVisible();

      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe('pong');
    });
  });
});
