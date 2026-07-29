import { test, expect } from '../../../playwright';
import { closeAllCollections, buildCommonLocators } from '../../utils/page';
import { openEnvironmentSelector, closeEnvironmentSelector } from '../../utils/page/environments';

test.describe('Environment Selector Search', () => {
  test.beforeAll(async ({ pageWithUserData: page }) => {
    await openEnvironmentSelector(page);
  });
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeEnvironmentSelector(page);
  });
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should focus search input when Backspace is pressed', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    const searchInput = locators.environment.searchInput();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press('Backspace');
    await expect(searchInput).toBeFocused();
    await closeEnvironmentSelector(page);
  });

  test('should focus search input when a printable key is pressed', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    const searchInput = locators.environment.searchInput();
    await searchInput.blur();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).not.toBeFocused();

    await page.keyboard.press('a');
    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue('a');
    await closeEnvironmentSelector(page);
  });

  test('should display all environments initially', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await expect(locators.environment.listItem('Development')).toBeVisible();
    await expect(locators.environment.listItem('Production')).toBeVisible();
    await expect(locators.environment.listItem('Staging')).toBeVisible();
    await expect(locators.environment.noEnvironmentItem()).toBeVisible();
    await closeEnvironmentSelector(page);
  });

  test('should filter environments by search text', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const searchInput = locators.environment.searchInput();
    await searchInput.fill('StAgInG');

    await expect(locators.environment.listItem('Staging')).toBeVisible();
    await expect(locators.environment.noEnvironmentItem()).toBeVisible();
    await expect(locators.environment.listItem('Development')).not.toBeVisible();
    await expect(locators.environment.listItem('Production')).not.toBeVisible();
    await closeEnvironmentSelector(page);
  });

  test('should clear search on Escape key', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const searchInput = locators.environment.searchInput();
    await searchInput.fill('prod');
    await searchInput.press('Escape');

    await expect(searchInput).toHaveValue('');
    await expect(locators.environment.listItem('Development')).toBeVisible();
    await expect(locators.environment.listItem('Production')).toBeVisible();
    await expect(locators.environment.listItem('Staging')).toBeVisible();
    await closeEnvironmentSelector(page);
  });

  test('should show "No results found" for non-matching search', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const searchInput = locators.environment.searchInput();
    await searchInput.fill('nonexistentenv');

    await expect(locators.environment.listItem()).toHaveCount(0);
    await expect(locators.environment.noResults()).toBeVisible();
    await expect(locators.environment.noEnvironmentItem()).toBeVisible();
    await closeEnvironmentSelector(page);
  });

  test('should clear search via clear button', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const searchInput = locators.environment.searchInput();
    await searchInput.fill('prod');

    const clearButton = locators.environment.searchClearBtn();
    await clearButton.click();

    await expect(searchInput).toHaveValue('');
    await expect(locators.environment.listItem('Development')).toBeVisible();
    await expect(locators.environment.listItem('Production')).toBeVisible();
    await expect(locators.environment.listItem('Staging')).toBeVisible();
    await closeEnvironmentSelector(page);
  });
});
