import { Page } from '../../../playwright';

export const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
  saveButton: () => page
    .locator('.infotip')
    .filter({ hasText: /^Save/ }),
  environment: {
    selector: () => page.getByTestId('environment-selector-trigger'),
    collectionTab: () => page.getByTestId('env-tab-collection'),
    envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true })
  },
  sidebar: {
    collection: (name: string) => page.locator('#sidebar-collection-name').filter({ hasText: name }),
    folder: (name: string) => page.locator('.collection-item-name').filter({ hasText: name }),
    request: (name: string) => page.locator('.collection-item-name').filter({ hasText: name })
  },
  tabs: {
    requestTab: () => page.locator('.request-tab .tab-label')
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
