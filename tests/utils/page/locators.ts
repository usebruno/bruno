import { Page } from '../../../playwright';

export const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
  saveButton: () => page
    .locator('.infotip')
    .filter({ hasText: /^Save/ }),
  sidebar: {
    collection: (name: string) => page.locator('#sidebar-collection-name').filter({ hasText: name }),
    folder: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    request: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    folderRequest: (folderName: string, requestName: string) => {
      // Find the folder's collection-item-name, then navigate to its parent wrapper container (StyledWrapper),
      // and search for the request within that container's descendants.
      // Using .locator('..') gets the parent element of the folder's collection-item-name div.
      const folderWrapper = page.locator('.collection-item-name').filter({ hasText: folderName }).locator('..');
      return folderWrapper.locator('.collection-item-name').filter({ hasText: requestName });
    }
  },
  actions: {
    collectionActions: (collectionName: string) =>
      page.locator('.collection-name')
        .filter({ hasText: collectionName })
        .locator('.collection-actions .icon')
  },
  dropdown: {
    item: (text: string) => page.locator('.dropdown-item').filter({ hasText: text })
  },
  tabs: {
    requestTab: (requestName: string) => page.locator('.request-tab .tab-label').filter({ hasText: requestName }),
    activeRequestTab: () => page.locator('.request-tab.active')
  },
  folder: {
    chevron: (folderName: string) => page.locator('.collection-item-name').filter({ hasText: folderName }).getByTestId('folder-chevron')
  },
  modal: {
    title: (title: string) => page.locator('.bruno-modal-header-title').filter({ hasText: title }),
    button: (name: string) => page.getByRole('button', { name: name, exact: true })
  }
});

export const buildWebsocketCommonLocators = (page: Page) => ({
  ...buildCommonLocators(page),
  connectionControls: {
    connect: () =>
      page
        .locator('div.connection-controls')
        .locator('.infotip')
        .filter({ hasText: /^Connect$/ }),
    disconnect: () =>
      page
        .locator('div.connection-controls')
        .locator('.infotip')
        .filter({ hasText: /^Close Connection$/ })
  },
  messages: () => page.locator('.ws-message'),
  toolbar: {
    latestFirst: () => page.getByRole('button', { name: 'Latest First' }),
    latestLast: () => page.getByRole('button', { name: 'Latest Last' }),
    clearResponse: () => page.getByRole('button', { name: 'Clear Response' })
  }
});
