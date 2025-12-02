import { Page } from '../../../playwright';

export const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
  saveButton: () => page
    .locator('.infotip')
    .filter({ hasText: /^Save/ }),
  sidebar: {
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
    closeAllCollectionsButton: () => page.getByTestId('close-all-collections-button')
  },
  actions: {
    collectionActions: (collectionName: string) =>
      page.locator('.collection-name')
        .filter({ hasText: collectionName })
        .locator('.collection-actions .icon'),
    collectionItemActions: (itemName: string) =>
      page.locator('.collection-item-name')
        .filter({ hasText: itemName })
        .locator('.menu-icon')

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
    byTitle: (title: string) => page.locator('.bruno-modal').filter({ has: page.locator('.bruno-modal-header-title').filter({ hasText: title }) }),
    button: (name: string) => page.getByRole('button', { name: name, exact: true }),
    closeButton: () => page.locator('.bruno-modal').getByTestId('modal-close-button')
  },
  environment: {
    selector: () => page.getByTestId('environment-selector-trigger'),
    collectionTab: () => page.getByTestId('env-tab-collection'),
    globalTab: () => page.getByTestId('env-tab-global'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true })
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

export const getTableCell = (row, index) => row.locator('td').nth(index);

export const buildGrpcCommonLocators = (page: Page) => ({
  ...buildCommonLocators(page),
  method: {
    dropdownTrigger: () => page.getByTestId('grpc-method-dropdown-trigger'),
    indicator: () => page.getByTestId('grpc-method-indicator')
  },
  request: {
    queryUrlContainer: () => page.getByTestId('grpc-query-url-container'),
    sendButton: () => page.getByTestId('grpc-send-request-button'),
    messagesContainer: () => page.getByTestId('grpc-messages-container'),
    addMessageButton: () => page.getByTestId('grpc-add-message-button'),
    sendMessage: (index: number) => page.getByTestId(`grpc-send-message-${index}`),
    endConnectionButton: () => page.getByTestId('grpc-end-connection-button'),
    cancelConnectionButton: () => page.getByTestId('grpc-cancel-connection-button')
  },
  response: {
    statusCode: () => page.getByTestId('grpc-response-status-code'),
    statusText: () => page.getByTestId('grpc-response-status-text'),
    content: () => page.getByTestId('grpc-response-content'),
    container: () => page.getByTestId('grpc-responses-container'),
    singleResponse: () => page.getByTestId('grpc-single-response'),
    accordion: () => page.getByTestId('grpc-responses-accordion'),
    responseItem: (index: number) => page.getByTestId(`grpc-response-item-${index}`),
    responseItems: () => page.locator('[data-testid^="grpc-response-item-"]'),
    tabCount: () => page.getByTestId('tab-response-count')
  }
});
