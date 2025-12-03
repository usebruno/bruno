import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Environment Name API Tests', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should test bru.getEnvName() and bru.environment.getEnvName()', async ({ pageWithUserData: page }) => {
    // Select the collection
    await page.locator('#sidebar-collection-name').click();

    // Select the "Production" environment
    await page.getByTestId('environment-selector-trigger').click();
    await expect(page.locator('.environment-list .dropdown-item', { hasText: 'Production' })).toBeVisible();
    await page.locator('.environment-list .dropdown-item', { hasText: 'Production' }).click();
    await expect(page.locator('.current-environment', { hasText: 'Production' })).toBeVisible();

    // Click on the request to open it
    await page.getByText('get-env-name', { exact: true }).click();

    // Send the request
    await page.getByTestId('send-arrow-icon').click();

    // Wait for the response
    await page.getByTestId('response-status-code').getByText(/200/).waitFor({ state: 'visible' });

    // Click on the Tests tab in the response pane (use last() to get the response pane, not request pane)
    await page.locator('.tabs .tab.tests').last().click();

    // Check that the test summary shows all tests passed
    await expect(page.getByText(/Tests \(4\), Passed: 4, Failed: 0/)).toBeVisible();

    // Verify specific test results
    await expect(page.getByText('bru.getEnvName() should return \'Production\'')).toBeVisible();
    await expect(page.getByText('bru.environment.getEnvName() should return \'Production\'')).toBeVisible();
    await expect(page.getByText('both getEnvName APIs should return the same value')).toBeVisible();
    await expect(page.getByText('response status should be 200')).toBeVisible();
  });

  test('should test bru.environment.getGlobalEnvName()', async ({ pageWithUserData: page }) => {
    // Select the collection
    await page.locator('#sidebar-collection-name').click();

    // Select the "Production" collection environment
    await page.getByTestId('environment-selector-trigger').click();
    await expect(page.locator('.environment-list .dropdown-item', { hasText: 'Production' })).toBeVisible();
    await page.locator('.environment-list .dropdown-item', { hasText: 'Production' }).click();
    await expect(page.locator('.current-environment', { hasText: 'Production' })).toBeVisible();

    // Click on the second request to open it
    await page.getByText('get-global-env-name', { exact: true }).click();

    // Send the request
    await page.getByTestId('send-arrow-icon').click();

    // Wait for the response
    await page.getByTestId('response-status-code').getByText(/200/).waitFor({ state: 'visible' });

    // Click on the Tests tab in the response pane (use last() to get the response pane, not request pane)
    await page.locator('.tabs .tab.tests').last().click();

    // Check that the test summary shows all tests passed
    await expect(page.getByText(/Tests \(2\), Passed: 2, Failed: 0/)).toBeVisible();

    // Verify specific test results
    await expect(page.getByText('bru.environment.getGlobalEnvName() should return \'Global Production\'')).toBeVisible();
    await expect(page.getByText('response status should be 200')).toBeVisible();
  });
});
