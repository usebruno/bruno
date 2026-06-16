import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe.serial('Environment Selector Search', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });
  test('should filter environments by search text and clear on escape', async ({ pageWithUserData: page }) => {
    // Select the collection
    await page.locator('#sidebar-collection-name').click();

    // open environment dropdown
    await page.getByTestId('environment-selector-trigger').click();

    // Verify Backspace focuses the input
    const searchInput = page.getByTestId('env-search-input');
    await expect(searchInput).toBeVisible(); // Wait for dropdown to mount
    await expect(searchInput).not.toBeFocused();
    await page.keyboard.press('Backspace');
    await expect(searchInput).toBeFocused();

    // Verify all environments are initially visible
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();
    await expect(page.getByTestId('env-no-environment-item')).toBeVisible();

    // Type in the search input
    await searchInput.fill('stage');

    // Verify Staging is visible, others are hidden, and No Environment remains
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();
    await expect(page.getByTestId('env-no-environment-item')).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).not.toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).not.toBeVisible();

    // Press Escape to clear the search
    await searchInput.press('Escape');

    // Verify search is cleared and all are visible again
    await expect(searchInput).toHaveValue('');
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();

    // Type in the search input again
    await searchInput.fill('prod');
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).not.toBeVisible();

    // Type a non-existent environment name to see "No results found"
    await searchInput.fill('nonexistentenv');
    await expect(page.getByTestId('env-list-item')).toHaveCount(0);
    await expect(page.getByTestId('env-no-results')).toBeVisible();
    await expect(page.getByTestId('env-no-environment-item')).toBeVisible();

    // Click the clear button
    const clearButton = page.getByTestId('env-search-clear-btn');
    await clearButton.click();

    // Verify search is cleared and all are visible again
    await expect(searchInput).toHaveValue('');
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();
  });
});
