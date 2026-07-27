import { Page } from '../../../../playwright';

/**
 * Locators for the sidebar (collections tree) section.
 */
export const buildSidebarLocators = (page: Page) => {
  const collectionRow = (name: string) => page.getByTestId('sidebar-collection-row').filter({ hasText: name });
  const itemRow = (name: string) => page.getByTestId('sidebar-collection-item-row').filter({ hasText: name });

  return {
    collectionsContainer: () => page.getByTestId('collections'),
    collection: (name: string) => page.locator('#sidebar-collection-name').filter({ hasText: name }),
    folder: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    request: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    folderRequest: (folderName: string, requestName: string) => {
      // Find the folder's collection-item-name, then navigate to its parent wrapper container (StyledWrapper),
      // and search for the request within that container's descendants.
      // Using .locator('..') gets the parent element of the folder's collection-item-name div.
      const folderWrapper = page.locator('.collection-item-name').filter({ hasText: folderName }).locator('..');
      return folderWrapper.locator('.collection-item-name').filter({ hasText: requestName });
    },
    closeAllCollectionsButton: () => page.getByTestId('collections-header-actions-menu-close-all'),
    collectionRow,
    itemRow,
    // The "..." menu on a sidebar row. `type` picks the row and the testid prefix:
    // 'item' for a collection item row (`collection-item-menu-*`), 'collection' for a
    // top-level collection row (`collection-actions-*`). Trigger is in the row; items
    // are portaled to <body>, so page-scoped.
    rowMenu: (name: string, type: 'item' | 'collection' = 'item') => {
      const row = type === 'collection' ? collectionRow(name) : itemRow(name);
      const testId = type === 'collection' ? 'collection-actions' : 'collection-item-menu';
      return {
        trigger: () => row.getByTestId(testId),
        item: (action: string) => page.getByTestId(`${testId}-${action}`)
      };
    },
    requestExamplesToggle: (requestName: string) =>
      page.getByTestId('sidebar-collection-item-row').filter({ hasText: requestName }).getByTestId('request-item-chevron'),
    example: (name: string) => page.getByTestId('sidebar-response-example-item').filter({ hasText: name }),
    // The sidebar tree wraps each collection in `#collection-<slug>`; scope queries
    // to it to disambiguate items that share names across collections.
    collectionScope: (name: string) => page.locator(`#collection-${name.replace(/\s+/g, '-').toLowerCase()}`)
  };
};
