import { test, expect } from '../../../playwright';

test.describe('Collection Environment Configuration Search Tests', () => {
  test('should filter collection environments and reset search on tab switch', async ({
    pageWithUserData: page
  }) => {
    // Open the collection from sidebar
    await page.locator('#sidebar-collection-name').filter({ hasText: 'collection-env-config-search' }).click();

    // Open the environment selector
    await page.getByTestId('environment-selector-trigger').click();

    // Initial check if all environments are visible
    await test.step('Verify initial environments are loaded and visible', async () => {
      await expect(page.getByText('test-1', { exact: true })).toBeVisible();
      await expect(page.getByText('test-2', { exact: true })).toBeVisible();
      await expect(page.getByText('test-3', { exact: true })).toBeVisible();
    });

    // Perform search
    await test.step('Perform search', async () => {
      await page.getByTestId('env-search-button').click();
      const searchInput = page.getByTestId('env-search-input');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('2');

      await expect(page.getByText('test-1', { exact: true })).not.toBeVisible();
      await expect(page.getByText('test-2', { exact: true })).toBeVisible();
      await expect(page.getByText('test-3', { exact: true })).not.toBeVisible();
    });

    // Clear search
    await page.getByTestId('reset-env-search').click();

    await test.step('All environments should be visible after clear search', async () => {
      await expect(page.getByText('test-1', { exact: true })).toBeVisible();
      await expect(page.getByText('test-2', { exact: true })).toBeVisible();
      await expect(page.getByText('test-3', { exact: true })).toBeVisible();
    });

    // Switch to global env tab
    await page.getByTestId('env-tab-global').click();

    // After switching tabs, the search input should be reset
    const searchInput = page.getByTestId('env-search-input');
    await expect(searchInput).not.toBeVisible();

    // When no global envs exist, the search button should be disabled
    await expect(page.getByTestId('env-search-button')).toBeDisabled();
  });
});
