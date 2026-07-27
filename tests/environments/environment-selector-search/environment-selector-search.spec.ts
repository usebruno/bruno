import { test, expect } from '../../../playwright';
import { closeAllCollections, buildCommonLocators, ensureEnvironmentSelectorOpen } from '../../utils/page';

test.describe('Environment Selector Search', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should focus search input when Backspace is pressed', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await ensureEnvironmentSelectorOpen(page);

    const searchInput = locators.environment.searchInput();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press('Backspace');
    await expect(searchInput).toBeFocused();
  });

  test('should focus search input when a printable key is pressed', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await ensureEnvironmentSelectorOpen(page);

    const searchInput = locators.environment.searchInput();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press('a');
    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue('a');
  });

  test('should display all environments initially', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await ensureEnvironmentSelectorOpen(page);

    await expect(locators.environment.listItem('Development')).toBeVisible();
    await expect(locators.environment.listItem('Production')).toBeVisible();
    await expect(locators.environment.listItem('Staging')).toBeVisible();
    await expect(locators.environment.noEnvironmentItem()).toBeVisible();
  });

  test('should filter environments by search text', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await ensureEnvironmentSelectorOpen(page);

    const searchInput = locators.environment.searchInput();
    await searchInput.fill('staging');

    await expect(locators.environment.listItem('Staging')).toBeVisible();
    await expect(locators.environment.noEnvironmentItem()).toBeVisible();
    await expect(locators.environment.listItem('Development')).not.toBeVisible();
    await expect(locators.environment.listItem('Production')).not.toBeVisible();
  });

  test('should clear search on Escape key', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await ensureEnvironmentSelectorOpen(page);

    const searchInput = locators.environment.searchInput();
    await searchInput.fill('prod');
    await searchInput.press('Escape');

    await expect(searchInput).toHaveValue('');
    await expect(locators.environment.listItem('Development')).toBeVisible();
    await expect(locators.environment.listItem('Production')).toBeVisible();
    await expect(locators.environment.listItem('Staging')).toBeVisible();
  });

  test('should show "No results found" for non-matching search', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await ensureEnvironmentSelectorOpen(page);

    const searchInput = locators.environment.searchInput();
    await searchInput.fill('nonexistentenv');

    await expect(locators.environment.listItem()).toHaveCount(0);
    await expect(locators.environment.noResults()).toBeVisible();
    await expect(locators.environment.noEnvironmentItem()).toBeVisible();
  });

  test('should clear search via clear button', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await ensureEnvironmentSelectorOpen(page);

    const searchInput = locators.environment.searchInput();
    await searchInput.fill('prod');

    const clearButton = locators.environment.searchClearBtn();
    await clearButton.click();

    await expect(searchInput).toHaveValue('');
    await expect(locators.environment.listItem('Development')).toBeVisible();
    await expect(locators.environment.listItem('Production')).toBeVisible();
    await expect(locators.environment.listItem('Staging')).toBeVisible();
  });
});
