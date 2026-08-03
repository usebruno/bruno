import { test, Page } from '../../../playwright';

// Locators for the Mock Server dashboard, routes table, request log, and related modals.
export const buildMockServerLocators = (page: Page) => ({
  collectionRow: (name: string) =>
    page.getByTestId('sidebar-collection-row').filter({ hasText: new RegExp(`^${name}$`) }),
  collectionName: (name: string) =>
    page.locator('#sidebar-collection-name').filter({ hasText: new RegExp(`^${name}$`) }),
  collectionActionsIcon: (name: string) =>
    page.getByTestId('sidebar-collection-row').filter({ hasText: new RegExp(`^${name}$`) }).locator('.collection-actions .icon'),
  createMockServerMenuItem: () => page.getByTestId('collection-actions-create-mock-server'),
  collectionHeaderMockServer: () => page.getByTestId('mock-server'),

  dashboard: () => page.getByTestId('mock-server-dashboard'),
  statusText: () => page.getByTestId('mock-server-status-text'),
  statusDot: () => page.getByTestId('mock-server-status-dot'),
  startBtn: () => page.getByTestId('mock-server-start-btn'),
  stopBtn: () => page.getByTestId('mock-server-stop-btn'),
  refreshBtn: () => page.getByTestId('mock-server-refresh-btn'),
  copyUrl: () => page.getByTestId('mock-server-copy-url'),
  delayInput: () => page.getByTestId('mock-server-delay-input'),
  stats: () => page.getByTestId('mock-server-stats'),

  tabResponses: () => page.getByTestId('mock-server-tab-responses'),
  tabRoutes: () => page.getByTestId('mock-server-tab-routes'),
  tabLog: () => page.getByTestId('mock-server-tab-log'),

  syncExamplesBtn: () => page.getByTestId('mock-response-sync-examples-btn'),
  syncExamplesModal: () => page.getByTestId('sync-mock-examples-modal'),
  syncExamplesSubmit: () => page.getByTestId('sync-mock-examples-modal-submit-btn'),
  syncSuccessToast: () => page.getByText('Mock responses synced with collection examples'),

  createModal: () => page.locator('.bruno-modal-card'),
  nameInput: () => page.getByTestId('mock-server-name-input'),
  modalSubmit: () => page.getByTestId('modal-submit-btn'),

  routeSearch: () => page.getByTestId('mock-server-route-search'),
  methodFilter: () => page.getByTestId('mock-server-method-filter'),
  routeRows: () => page.getByTestId('mock-server-routes-table').locator('tbody tr'),

  matchFilter: () => page.getByTestId('mock-server-match-filter'),
  statusFilter: () => page.getByTestId('mock-server-status-filter'),
  logCount: () => page.getByTestId('mock-server-log-count'),
  logClear: () => page.getByTestId('mock-server-log-clear'),
  logEmptyState: () => page.getByText('No requests logged yet'),
  logMethodBadges: () => page.locator('.log-table-container .method-badge'),
  logPaths: () => page.locator('.log-table-container .log-path'),
  logNoMatchLabels: () => page.locator('.log-table-container .no-match-label'),
  logStatusCodes: () => page.locator('.log-table-container .status-code'),

  filterOption: (label: string) => page.getByRole('option', { name: label, exact: true }),
  refreshToast: () => page.getByText(/Routes refreshed.*routes/).first()
});

// Open the mock server dashboard for a collection via the collection header tab.
export const openMockServerTab = async (page: Page, collectionName: string) => {
  await test.step(`Open mock server tab for "${collectionName}"`, async () => {
    const ms = buildMockServerLocators(page);
    await ms.collectionName(collectionName).click();
    await ms.collectionHeaderMockServer().click();
    await ms.dashboard().waitFor({ state: 'visible' });
  });
};

// Sync mock responses from collection examples. Waits for modal + toast; does not assert.
export const syncResponsesFromExamples = async (page: Page, collectionName: string) => {
  await test.step('Sync mock responses from collection examples', async () => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, collectionName);
    await ms.tabResponses().click();
    await ms.syncExamplesBtn().waitFor({ state: 'visible', timeout: 10000 });
    await ms.syncExamplesBtn().click();
    await ms.syncExamplesModal().waitFor({ state: 'visible', timeout: 10000 });
    await ms.syncExamplesSubmit().click();
    await ms.syncSuccessToast().waitFor({ state: 'visible', timeout: 10000 });
  });
};

// Start the mock server and return the port it reports.
export const startMockServer = async (page: Page): Promise<string> => {
  return await test.step('Start mock server', async () => {
    const ms = buildMockServerLocators(page);
    await ms.startBtn().click();
    const running = ms.statusText().filter({ hasText: /Running on port/ });
    await running.waitFor({ state: 'visible', timeout: 15000 });
    const text = await ms.statusText().innerText();
    const portMatch = text.match(/Running on port (\d+)/);
    if (!portMatch) {
      throw new Error(`Unable to parse mock server port from status: ${text}`);
    }
    return portMatch[1];
  });
};

// Stop the mock server and wait until status shows Stopped.
export const stopMockServer = async (page: Page) => {
  await test.step('Stop mock server', async () => {
    const ms = buildMockServerLocators(page);
    await ms.stopBtn().click();
    await ms.statusText().filter({ hasText: 'Stopped' }).waitFor({ state: 'visible', timeout: 15000 });
  });
};

// Open the create-mock-server flow from a collection's actions menu and submit a name.
export const createMockServerFromCollection = async (page: Page, collectionName: string, serverName: string) => {
  await test.step(`Create mock server "${serverName}" for "${collectionName}"`, async () => {
    const ms = buildMockServerLocators(page);
    const collection = ms.collectionRow(collectionName);
    await collection.hover();
    await ms.collectionActionsIcon(collectionName).click();
    await ms.createMockServerMenuItem().waitFor({ state: 'visible', timeout: 10000 });
    await ms.createMockServerMenuItem().click();
    await ms.createModal().waitFor({ state: 'visible', timeout: 10000 });
    await ms.nameInput().fill(serverName);
    await ms.modalSubmit().click();
    await ms.dashboard().waitFor({ state: 'visible', timeout: 10000 });
  });
};
