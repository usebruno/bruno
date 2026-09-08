import { Locator, Page } from '../../../../playwright';

export type EmptyStateRequestType = 'http' | 'graphql' | 'grpc' | 'websocket';

/**
 * Locators for the sidebar (collections tree) section.
 */
export const buildSidebarLocators = (page: Page) => {
  const itemByName = (name: string): Locator =>
    page.locator('.item-name').and(page.getByTitle(name, { exact: true }));

  const collectionRow = (name: string) => page.getByTestId('sidebar-collection-row').filter({ hasText: name });
  const itemRow = (name: string) => page.getByTestId('sidebar-collection-item-row').filter({ has: itemByName(name) });

  const collectionScope = (name: string) => page.locator(`#collection-${name.replace(/\s+/g, '-').toLowerCase()}`);

  return {
    collectionsContainer: () => page.getByTestId('collections'),
    collection: (name?: string) => name ? page.locator('#sidebar-collection-name').filter({ hasText: name }) : page.locator('#sidebar-collection-name'),
    folder: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    request: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    collectionChevron: (name: string) => collectionRow(name).getByTestId('collection-chevron'),
    folderRequest: (folderName: string, requestName: string) => {
      // Find the folder's collection-item-name, then navigate to its parent wrapper container (StyledWrapper),
      // and search for the request within that container's descendants.
      // Using .locator('..') gets the parent element of the folder's collection-item-name div.
      const folderWrapper = page.locator('.collection-item-name').filter({ hasText: folderName }).locator('..');
      return folderWrapper.locator('.collection-item-name').filter({ hasText: requestName });
    },
    closeAllCollectionsButton: () => page.getByTestId('collections-header-actions-menu-close-all'),
    collectionRow,
    collectionRows: () => page.getByTestId('sidebar-collection-row'),
    itemRow,
    itemByName,
    itemsIn: (collectionName: string, name: string): Locator =>
      collectionScope(collectionName).locator('.item-name').and(page.getByTitle(name, { exact: true })),
    itemRowIn: (collectionName: string, name: string): Locator =>
      collectionScope(collectionName).getByTestId('sidebar-collection-item-row').filter({ has: itemByName(name) }),

    // "+ Add request" cta inside the empty collection
    emptyStateCta: (collectionName: string): Locator =>
      collectionScope(collectionName).getByTestId('add-request-cta'),
    emptyStateCtaItem: (requestType: EmptyStateRequestType): Locator =>
      page.getByTestId(`add-request-cta-${requestType}`),

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
    collectionScope,
    scopedItem: function (collectionName: string, itemName: string) {
      return this.collectionScope(collectionName).locator('.item-name').and(page.getByTitle(itemName, { exact: true }));
    },
    dragHandle: () => page.getByTestId('sidebar-drag-handle'),
    toggleSidebarButton: () => page.getByTestId('toggle-sidebar-button'),
    sidebarContainer: () => page.getByTestId('sidebar'),

    // Modals opened from a sidebar row's "..." menu.
    renameItemModal: {
      nameInput: (): Locator => page.locator('#collection-item-name'),
      submit: (): Locator => page.getByTestId('rename-item-button'),
      filenameEditIcon: (): Locator => page.getByTestId('rename-request-edit-icon')
    },

    newRequestModal: {
      createButton: (): Locator => page.getByTestId('create-new-request-button'),
      filenameEditIcon: (): Locator => page.getByTestId('filename-edit-icon')
    },

    newFolderModal: {
      nameInput: (): Locator => page.getByTestId('new-folder-input')
    },

    cloneCollectionModal: {
      nameInput: (): Locator => page.locator('#collection-name'),
      locationInput: (): Locator => page.locator('#collection-location'),
      browseButton: (): Locator => page.getByText('Browse', { exact: true })
    },

    saveRequestModal: {
      modal: (): Locator => page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' }),
      nameInput: (): Locator => page.locator('#request-name')
    },

    filesystemName: {
      optionsButton: (): Locator => page.locator('.btn-advanced'),
      showFilesystemNameItem: (): Locator =>
        page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }),
      fileNameInput: (): Locator => page.locator('#file-name')
    }
  };
};
