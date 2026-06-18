import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Environment Selector Search', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should focus search input when Backspace is pressed', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('environment-selector-trigger').click();

    const searchInput = page.getByTestId('env-search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press('Backspace');
    await expect(searchInput).toBeFocused();
  });

  test('should focus search input when a printable key is pressed', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('environment-selector-trigger').click();

    const searchInput = page.getByTestId('env-search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press('a');
    await expect(searchInput).toBeFocused();
  });

  test('should display all environments initially', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('environment-selector-trigger').click();

    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();
    await expect(page.getByTestId('env-no-environment-item')).toBeVisible();
  });

  test('should filter environments by search text', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('environment-selector-trigger').click();

    const searchInput = page.getByTestId('env-search-input');
    await searchInput.fill('staging');

    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();
    await expect(page.getByTestId('env-no-environment-item')).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).not.toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).not.toBeVisible();
  });

  test('should clear search on Escape key', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('environment-selector-trigger').click();

    const searchInput = page.getByTestId('env-search-input');
    await searchInput.fill('prod');
    await searchInput.press('Escape');

    await expect(searchInput).toHaveValue('');
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();
  });

  test('should show "No results found" for non-matching search', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('environment-selector-trigger').click();

    const searchInput = page.getByTestId('env-search-input');
    await searchInput.fill('nonexistentenv');

    await expect(page.getByTestId('env-list-item')).toHaveCount(0);
    await expect(page.getByTestId('env-no-results')).toBeVisible();
    await expect(page.getByTestId('env-no-environment-item')).toBeVisible();
  });

  test('should clear search via clear button', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByTestId('environment-selector-trigger').click();

    const searchInput = page.getByTestId('env-search-input');
    await searchInput.fill('prod');

    const clearButton = page.getByTestId('env-search-clear-btn');
    await clearButton.click();

    await expect(searchInput).toHaveValue('');
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Development' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByTestId('env-list-item').filter({ hasText: 'Staging' })).toBeVisible();
  });
});
