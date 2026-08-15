import { Page } from '../../../../playwright';

/**
 * Locators for the sidebar (collections tree) section.
 */
export const buildSidebarLocators = (page: Page) => {
  const collectionRow = (name: string) => page.getByTestId('sidebar-collection-row').filter({ hasText: name });
  const itemRow = (name: string) => page.getByTestId('sidebar-collection-item-row').filter({ hasText: name });

  return {
    collectionsContainer: () => page.getByTestId('collections'),
    collection: (name?: string) => name ? page.locator('#sidebar-collection-name').filter({ hasText: name }) : page.locator('#sidebar-collection-name'),
    folder: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    request: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    collectionChevron: (name: string) => collectionRow(name).getByTestId('collection-chevron'),
    folderRequest: (folderName: string, requestName: string) => {
      // The sidebar is a flat, virtualized list — rows are siblings, not nested. Each row's
      // wrapper carries `data-parent-name` (its containing folder), so scope by that instead
      // of DOM nesting.
      return page.locator(`[data-parent-name="${folderName}"]`).locator('.collection-item-name').filter({ hasText: requestName });
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
    // The flat, virtualized sidebar stamps every row of a collection with
    // `data-collection-id="<slug>"`; scope queries to it to disambiguate items that share
    // names across collections (the old `#collection-<slug>` wrapper now holds only the header).
    collectionScope: (name: string) => page.locator(`[data-collection-id="${name.replace(/\s+/g, '-').toLowerCase()}"]`),
    // Scope to the direct children of a folder (rows stamped with `data-parent-name`).
    folderScope: (folderName: string) => page.locator(`[data-parent-name="${folderName}"]`),
    dragHandle: () => page.getByTestId('sidebar-drag-handle'),
    toggleSidebarButton: () => page.getByTestId('toggle-sidebar-button'),
    sidebarContainer: () => page.getByTestId('sidebar')
  };
};
