import { test, expect, Page } from '../../../../playwright';
import { setSandboxMode } from '../../../utils/page';

/**
 * Select a tab from the response pane, handling the overflow dropdown if needed
 */
const selectResponsePaneTab = async (page: Page, tabName: string) => {
  const responsePane = page.locator('.response-pane');
  const visibleTab = responsePane.getByRole('tab', { name: tabName });
  const overflowButton = responsePane.locator('.more-tabs');

  // Check if tab is directly visible
  if (await visibleTab.isVisible()) {
    await visibleTab.click();
    return;
  }

  // Check if there's an overflow dropdown
  if (await overflowButton.isVisible()) {
    await overflowButton.click();

    // Wait for dropdown to appear and click the menu item
    const dropdownItem = page.locator('.tippy-box .dropdown-item').filter({ hasText: tabName });
    await expect(dropdownItem).toBeVisible();
    await dropdownItem.click();
    return;
  }

  throw new Error(`Tab "${tabName}" not found in visible tabs or overflow dropdown`);
};

test.describe.serial('bru.isSafeMode() API', () => {
  test('returns false when running in developer mode', async ({ pageWithUserData: page }) => {
    // Open the request
    const collectionContainer = page.getByTestId('collections').locator('.collection-name').filter({ hasText: 'is-safe-mode-test' });
    await collectionContainer.click();

    // Click on the test-safe-mode-false request
    const request = page.getByTestId('sidebar-collection-item-row').filter({ hasText: 'test-safe-mode-false' });
    await request.click();

    // Send the request
    await page.getByTestId('send-arrow-icon').click();

    // Wait for response
    await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: 30000 });

    // Check the Tests tab for results (may be in overflow dropdown)
    await selectResponsePaneTab(page, 'Tests');

    // Verify the test passed
    await expect(page.locator('.test-success').filter({ hasText: 'bru.isSafeMode() returns false in developer mode' })).toBeVisible();
  });

  test('returns true when running in safe mode', async ({ pageWithUserData: page }) => {
    // Switch to safe mode
    await setSandboxMode(page, 'is-safe-mode-test', 'safe');

    // Open the request that tests for safe mode = true
    const collectionContainer = page.getByTestId('collections').locator('.collection-name').filter({ hasText: 'is-safe-mode-test' });
    await collectionContainer.click();

    // Click on the test-safe-mode-true request
    const request = page.getByTestId('sidebar-collection-item-row').filter({ hasText: 'test-safe-mode-true' });
    await request.click();

    // Send the request
    await page.getByTestId('send-arrow-icon').click();

    // Wait for response
    await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: 30000 });

    // Check the Tests tab for results (may be in overflow dropdown)
    await selectResponsePaneTab(page, 'Tests');

    // Verify the test passed
    await expect(page.locator('.test-success').filter({ hasText: 'bru.isSafeMode() returns true in safe mode' })).toBeVisible();
  });
});
