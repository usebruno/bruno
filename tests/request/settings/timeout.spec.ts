import { expect, Page, test } from '../../../playwright';
import { closeAllCollections, selectRequestPaneTab } from '../../utils/page';

const setGlobalRequestTimeout = async (page: Page, value: string) => {
  // Open preferences tab
  await page.locator('.status-bar button[data-trigger="preferences"]').click();

  // Navigate to General tab (default, but ensure it)
  const generalTab = page.getByRole('tab', { name: 'General' });
  await expect(generalTab).toBeVisible({ timeout: 10000 });
  await generalTab.click();

  // Update the Request Timeout (in ms) preference
  const timeoutPreference = page.locator('input[name="timeout"]');
  await expect(timeoutPreference).toBeVisible({ timeout: 10000 });
  await timeoutPreference.fill(value);
  await expect(timeoutPreference).toHaveValue(value, { timeout: 5000 });

  // Closing the preferences tab unmounts the form, which flushes the debounced save immediately
  const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
  await preferencesTab.hover();
  await preferencesTab.locator('.close-icon').click({ force: true });
  await expect(preferencesTab).not.toBeVisible({ timeout: 10000 });
};

test.describe('Timeout Settings Tests', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test.describe('bru request timeout settings', () => {
    test('should configure and test timeout settings', async ({
      pageWithUserData: page
    }) => {
      // Navigate to the test collection and request
      await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();

      await page.locator('#sidebar-collection-name').getByText('settings-test').click();
      // Navigate to thetimeout request
      await page.getByRole('complementary').getByText('timeout-test').click();

      // Go to Settings tab
      await selectRequestPaneTab(page, 'Settings');

      // Test Timeout Settings with custom value
      const timeoutInput = page.locator('input[id="timeout"]');
      await expect(timeoutInput).toBeVisible();

      // Verify default value from .bru file (5)
      await expect(timeoutInput).toHaveValue('5');

      await page.getByTestId('send-arrow-icon').click();

      const responsePane = page.locator('.response-pane');
      await expect(responsePane).toContainText('timeout of 5ms exceeded');

      // Change the global request timeout preference that "inherit" should fall back to
      await setGlobalRequestTimeout(page, '10');

      // Return to the request and Settings tab
      await page.getByRole('complementary').getByText('timeout-test').click();
      await selectRequestPaneTab(page, 'Settings');

      // Now test inherit functionality
      // Click the X button to reset to inherit
      const resetButton = page.locator('button[title="Reset to inherit"]');
      await expect(resetButton).toBeVisible();
      await resetButton.click();

      // After reset, should see "Inherit" button instead of input
      const inheritButton = page.locator('button:has-text("Inherit")');
      await expect(inheritButton).toBeVisible();
      await expect(timeoutInput).not.toBeVisible();

      // Run the request with inherit timeout
      await page.getByTestId('send-arrow-icon').click();

      // Verify the request runs successfully with inherited timeout (should not timeout)
      await expect(responsePane).toContainText('302');

      // Close without saving to avoid modifying the .bru file
      await page.locator('.close-icon-container').click({ force: true });
      await page.locator('button:has-text("Don\'t Save")').first().click();
    });
  });

  test.describe('yaml request timeout settings', () => {
    test('should configure and test timeout settings for yaml request', async ({
      pageWithUserData: page
    }) => {
      // Navigate to the yaml test collection and request
      await expect(page.locator('#sidebar-collection-name').getByText('settings-yaml')).toBeVisible();

      await page.locator('#sidebar-collection-name').getByText('settings-yaml').click();
      // Navigate to the timeout request
      await page.getByRole('complementary').getByText('timeout-test-yaml').click();

      // Go to Settings tab
      await selectRequestPaneTab(page, 'Settings');

      // Test Timeout Settings with custom value
      const timeoutInput = page.locator('input[id="timeout"]');
      await expect(timeoutInput).toBeVisible();

      // Verify default value from .yml file (5)
      await expect(timeoutInput).toHaveValue('5');

      await page.getByTestId('send-arrow-icon').click();

      // Verify the custom timeout (5ms) is applied
      const responsePane = page.locator('.response-pane');
      await expect(responsePane).toContainText('timeout of 5ms exceeded');

      // Change the global request timeout preference that "inherit" should fall back to
      await setGlobalRequestTimeout(page, '10');

      // Return to the request and Settings tab
      await page.getByRole('complementary').getByText('timeout-test-yaml').click();
      await selectRequestPaneTab(page, 'Settings');

      // Now test inherit functionality
      // Click the X button to reset to inherit
      const resetButton = page.locator('button[title="Reset to inherit"]');
      await expect(resetButton).toBeVisible();
      await resetButton.click();

      // After reset, should see "Inherit" button instead of input
      const inheritButton = page.locator('button:has-text("Inherit")');
      await expect(inheritButton).toBeVisible();
      await expect(timeoutInput).not.toBeVisible();

      // Run the request with inherit timeout
      await page.getByTestId('send-arrow-icon').click();

      // Verify the inherited timeout resolves to the new global preference (10ms), not the file value (5ms)
      await expect(responsePane).toContainText('timeout of 10ms exceeded', { timeout: 15000 });

      // Close without saving to avoid modifying the .yml file
      await page.locator('.close-icon-container').click({ force: true });
      await page.locator('button:has-text("Don\'t Save")').first().click();
    });
  });
});
