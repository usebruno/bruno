import { test, Page } from '../../../playwright';

/**
 * Locators for the Workspace Home overview (the collection cards grid).
 */
export const buildWorkspaceOverviewLocators = (page: Page) => {
  const card = (collectionName: string) =>
    page.getByTestId('collection-card').filter({ hasText: collectionName });

  return {
    homeButton: () => page.locator('.titlebar-left .home-button'),
    card,
    cardMenu: (collectionName: string) => card(collectionName).locator('.collection-menu'),
    gitBadge: (collectionName: string) => card(collectionName).getByTestId('collection-git-badge'),
    failedBadge: (collectionName: string) => card(collectionName).getByTestId('collection-failed-badge'),
    notClonedBadge: (collectionName: string) => card(collectionName).getByTestId('collection-not-cloned-badge')
  };
};

/**
 * Navigate to the Workspace Home overview via the title bar home button
 * @param page - The page object
 */
const openWorkspaceOverview = async (page: Page) => {
  await test.step('Open the workspace overview', async () => {
    await buildWorkspaceOverviewLocators(page).homeButton().click();
  });
};

/**
 * Open a collection card's "..." menu and click one of its entries
 * @param page - The page object
 * @param collectionName - The name of the collection whose card menu to open
 * @param itemLabel - The exact label of the dropdown entry to click
 */
const selectCollectionCardMenuItem = async (page: Page, collectionName: string, itemLabel: string) => {
  await test.step(`Select "${itemLabel}" from the "${collectionName}" card menu`, async () => {
    await buildWorkspaceOverviewLocators(page).cardMenu(collectionName).click();
    await page.locator('.dropdown-item').getByText(itemLabel, { exact: true }).click();
  });
};

export { openWorkspaceOverview, selectCollectionCardMenuItem };
