import { test, expect, Page } from '../../playwright';
import { fillRequestUrl, sendRequest, clickResponseAction, createCollection, closeAllCollections } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe.serial('Scratch Requests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeAll(async ({ page }) => {
    locators = buildCommonLocators(page);

    // Wait for the app to fully load
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
  });

  test.afterAll(async ({ page }) => {
    // Clean up any regular collections
    await closeAllCollections(page);
    // Note: The playwright fixture handles "Don't Save" modal when app closes
  });

  /**
   * Helper to create a scratch request when on workspace overview
   */
  const createScratchRequest = async (page: Page, requestType: 'HTTP' | 'GraphQL' | 'gRPC' | 'WebSocket' = 'HTTP') => {
    await test.step(`Create scratch ${requestType} request`, async () => {
      // Click the + button to create a new request (this is on the workspace overview)
      const createButton = page.getByRole('button', { name: 'New Transient Request' });
      await createButton.waitFor({ state: 'visible', timeout: 5000 });

      // Right-click to open the dropdown menu
      await createButton.click({ button: 'right' });

      // Wait for dropdown to be visible
      await page.locator('.dropdown-item').first().waitFor({ state: 'visible' });

      // Select the request type from dropdown
      await page.locator('.dropdown-item').filter({ hasText: requestType }).click();

      // Wait for the request tab to be active
      await page.locator('.request-tab.active').waitFor({ state: 'visible' });
      await expect(page.locator('.request-tab.active')).toContainText('Untitled');
      await page.waitForTimeout(300);
    });
  };

  /**
   * Helper to navigate to workspace overview (home)
   */
  const goToWorkspaceOverview = async (page: Page) => {
    await test.step('Navigate to workspace overview', async () => {
      // Click the home icon in the title bar to go to workspace overview
      const homeButton = page.locator('.titlebar-left .home-button');
      await homeButton.click();
      await page.waitForTimeout(300);
    });
  };

  test('Create scratch HTTP request - should open in workspace tabs', async ({ page }) => {
    await test.step('Navigate to workspace overview', async () => {
      await goToWorkspaceOverview(page);
    });

    await test.step('Create scratch HTTP request', async () => {
      await createScratchRequest(page, 'HTTP');
      await fillRequestUrl(page, 'http://localhost:8081/ping');
    });

    await test.step('Verify HTTP request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });

    await test.step('Verify workspace header shows for scratch collection', async () => {
      // Scratch requests should show the workspace header, not collection toolbar
      const workspaceTitle = page.locator('.workspace-title');
      await expect(workspaceTitle).toBeVisible();
    });
  });

  test('Create scratch GraphQL request', async ({ page }) => {
    await test.step('Navigate to workspace overview', async () => {
      await goToWorkspaceOverview(page);
    });

    await test.step('Create scratch GraphQL request', async () => {
      await createScratchRequest(page, 'GraphQL');
      await fillRequestUrl(page, 'https://api.example.com/graphql');
    });

    await test.step('Verify GraphQL request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });
  });

  test('Create scratch gRPC request', async ({ page }) => {
    await test.step('Navigate to workspace overview', async () => {
      await goToWorkspaceOverview(page);
    });

    await test.step('Create scratch gRPC request', async () => {
      await createScratchRequest(page, 'gRPC');
      await fillRequestUrl(page, 'grpc://localhost:50051');
    });

    await test.step('Verify gRPC request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });
  });

  test('Create scratch WebSocket request', async ({ page }) => {
    await test.step('Navigate to workspace overview', async () => {
      await goToWorkspaceOverview(page);
    });

    await test.step('Create scratch WebSocket request', async () => {
      await createScratchRequest(page, 'WebSocket');
      await fillRequestUrl(page, 'ws://localhost:8082');
    });

    await test.step('Verify WebSocket request tab is open', async () => {
      const activeTab = page.locator('.request-tab.active');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toContainText('Untitled');
    });
  });

  test('Send scratch HTTP request - verify response', async ({ page }) => {
    await test.step('Navigate to workspace overview', async () => {
      await goToWorkspaceOverview(page);
    });

    await test.step('Create scratch HTTP request', async () => {
      await createScratchRequest(page, 'HTTP');
      await fillRequestUrl(page, 'http://localhost:8081/ping');
    });

    await test.step('Send request and verify response', async () => {
      await sendRequest(page, 200);

      // Copy response to clipboard and verify
      await clickResponseAction(page, 'response-copy-btn');
      await expect(page.getByText('Response copied to clipboard')).toBeVisible();

      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe('pong');
    });
  });

  test('Save scratch request to a collection', async ({ page, createTmpDir }) => {
    // Create a collection to save the scratch request to
    const collectionPath = await createTmpDir('scratch-save-target');
    await createCollection(page, 'scratch-save-test', collectionPath);

    await test.step('Navigate to workspace overview', async () => {
      await goToWorkspaceOverview(page);
    });

    await test.step('Create scratch HTTP request', async () => {
      await createScratchRequest(page, 'HTTP');
      await fillRequestUrl(page, 'http://localhost:8081/echo');
    });

    await test.step('Trigger save action using keyboard shortcut', async () => {
      const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
      await page.keyboard.press(saveShortcut);
    });

    await test.step('Fill in save dialog', async () => {
      // Wait for save modal to appear - scratch requests show "Select Collection" first
      const saveModal = page.locator('.bruno-modal-card');
      await expect(saveModal).toBeVisible({ timeout: 5000 });

      // Fill in request name
      const requestNameInput = saveModal.locator('#request-name');
      await requestNameInput.clear();
      await requestNameInput.fill('Saved Scratch Request');

      // Select the target collection from the list (this transitions from "Select Collection" to "Save Request")
      const collectionSelector = saveModal.locator('.collection-item').filter({ hasText: 'scratch-save-test' });
      await collectionSelector.click();

      // Wait for the modal to transition to "Save Request" state (Save button becomes visible)
      const saveButton = saveModal.getByRole('button', { name: 'Save' });
      await expect(saveButton).toBeVisible({ timeout: 5000 });

      // Click Save button
      await saveButton.click();

      // Wait for success toast
      await expect(page.getByText('Request saved')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify saved request appears in collection sidebar', async () => {
      // Click on the collection to ensure it's expanded
      await locators.sidebar.collection('scratch-save-test').click();

      // Look for the saved request in sidebar
      const savedRequest = locators.sidebar.request('Saved Scratch Request');
      await expect(savedRequest).toBeVisible();
    });
  });

  test('Multiple scratch requests maintain separate tabs', async ({ page }) => {
    await test.step('Navigate to workspace overview', async () => {
      await goToWorkspaceOverview(page);
    });

    await test.step('Create first scratch HTTP request', async () => {
      await createScratchRequest(page, 'HTTP');
      await fillRequestUrl(page, 'http://localhost:8081/ping');
    });

    await test.step('Create second scratch HTTP request', async () => {
      await createScratchRequest(page, 'HTTP');
      await fillRequestUrl(page, 'http://localhost:8081/echo');
    });

    await test.step('Verify both tabs exist', async () => {
      const tabs = page.locator('.request-tab');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(2);

      // Both should contain "Untitled" with different numbers
      await expect(tabs.filter({ hasText: 'Untitled' }).first()).toBeVisible();
    });
  });
});
