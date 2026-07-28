import { expect, Page, test, Locator } from '@playwright/test';

/**
 * Builds locators for collection header components like the environment selector dropdown.
 */
export const buildCollectionHeaderLocators = (page: Page) => ({
  environment: {
    selector: () => page.getByTestId('environment-selector-trigger'),
    collectionTab: () => page.getByTestId('env-tab-collection'),
    globalTab: () => page.getByTestId('env-tab-global'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true }),
    listOption: (name: string) => page.locator('.environment-list .dropdown-item', { hasText: name }),
    searchInput: () => page.getByTestId('env-search-input'),
    searchClearBtn: () => page.locator('.env-list-search .close-icon'),
    listItem: (name?: string) => name ? page.getByTestId('env-list-item').filter({ hasText: name }) : page.getByTestId('env-list-item'),
    noResults: () => page.getByTestId('env-no-results'),
    noEnvironmentItem: () => page.getByTestId('env-no-environment-item'),
    currentEnvironment: () => page.locator('.current-environment')
  }
});

/**
 * Ensures a dropdown is open and in a clean state.
 * @param page - The page object
 * @param trigger - Locator for the dropdown trigger
 * @param searchInput - Locator for the dropdown search input
 * @param additionalReset - Optional function to run if the dropdown was already open
 * @param preCheck - Optional function to run before checking if dropdown is open (e.g. closing other elements)
 * @returns void
 */
export const ensureDropdownOpen = async (
  page: Page,
  trigger: Locator,
  searchInput: Locator,
  additionalReset?: () => Promise<void>,
  preCheck?: () => Promise<void>
) => {
  await test.step('Ensure dropdown is open', async () => {
    if (preCheck) {
      await preCheck();
    }

    if (!(await searchInput.isVisible())) {
      await trigger.click();
    } else {
      await searchInput.fill(''); // Reset search state if already open

      if (additionalReset) {
        await additionalReset();
      }

      await searchInput.blur(); // Remove focus to ensure tests start clean
    }

    await expect(searchInput).toBeVisible();
  });
};

/**
 * Ensures the environment selector dropdown is open and in a clean state
 * @param page - The page object
 * @returns void
 */
export const ensureEnvironmentSelectorOpen = async (page: Page) => {
  const locators = buildCollectionHeaderLocators(page);
  const trigger = locators.environment.selector();
  const searchInput = locators.environment.searchInput();
  const globalTab = locators.environment.globalTab();
  const collectionTab = locators.environment.collectionTab();

  await ensureDropdownOpen(
    page,
    trigger,
    searchInput,
    async () => {
      // additional reset: Ensure collection tab is selected
      if (await globalTab.isVisible()) {
        const globalClass = (await globalTab.getAttribute('class')) || '';
        if (globalClass.includes('active')) {
          await collectionTab.click();
        }
      }
      await expect(collectionTab).toHaveClass(/active/);
    },
    async () => {
      // pre-check: ensure the trigger is visible, otherwise click collection name to reveal
      if (!(await trigger.isVisible())) {
        await page.locator('#sidebar-collection-name').first().click();
      }
    }
  );
};
