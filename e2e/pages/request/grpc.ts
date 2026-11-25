import { test, expect, Page } from '../../playwright';
import { buildSidebarLocators } from '../sidebar/collection-tree';
import { buildRequestTabsLocators } from '../app-shell/tabs';

type GrpcTestSectionKey = 'beforeCallStart' | 'beforeMessageSend' | 'afterMessageReceive' | 'afterCallEnd';

/**
 * gRPC-specific locators. buildGrpcCommonLocators (in the shared locators) layers these over the common ones.
 */
export const buildGrpcLocators = (page: Page) => ({
  method: {
    dropdownTrigger: () => page.getByTestId('grpc-method-dropdown-trigger'),
    indicator: () => page.getByTestId('grpc-method-indicator'),
    dropdown: () => page.getByTestId('grpc-methods-dropdown'),
    item: (methodName: string) =>
      page.getByTestId('grpc-methods-dropdown').getByTestId('grpc-method-item').filter({ hasText: methodName }),
    selectedName: () => page.getByTestId('selected-grpc-method-name')
  },
  request: {
    queryUrlContainer: () => page.getByTestId('grpc-query-url-container'),
    sendButton: () => page.getByTestId('grpc-send-request-button'),
    messagesContainer: () => page.getByTestId('grpc-messages-container'),
    messages: () => page.getByTestId('grpc-messages-container').locator('.message-container'),
    addMessageButton: () => page.getByTestId('grpc-add-message-button'),
    regenerateMessage: (index: number) => page.getByTestId(`grpc-regenerate-message-${index}`),
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
    list: () => page.getByTestId('grpc-responses-list'),
    responseItem: (index: number) => page.getByTestId(`grpc-response-item-${index}`),
    responseItems: () => page.locator('[data-testid^="grpc-response-item-"]'),
    tabCount: () => page.getByRole('tab', { name: 'Response' }).getByTestId('grpc-tab-response-count'),
    tests: {
      passedCount: () => page.getByTestId('responsive-tab-tests').getByTestId('grpc-tests-passed-count'),
      failedCount: () => page.getByTestId('responsive-tab-tests').getByTestId('grpc-tests-failed-count'),
      section: (hook: GrpcTestSectionKey) => page.getByTestId(`grpc-test-section-${hook}`),
      summary: (hook: GrpcTestSectionKey) => page.getByTestId(`grpc-test-section-${hook}`).locator('.test-summary'),
      rows: (hook: GrpcTestSectionKey) => page.getByTestId(`grpc-test-section-${hook}`).getByTestId('test-result-item'),
      passedRows: (hook: GrpcTestSectionKey) =>
        page
          .getByTestId(`grpc-test-section-${hook}`)
          .getByTestId('test-result-item')
          .filter({ has: page.getByTestId('test-result-icon-pass') }),
      failedRows: (hook: GrpcTestSectionKey) =>
        page
          .getByTestId(`grpc-test-section-${hook}`)
          .getByTestId('test-result-item')
          .filter({ has: page.getByTestId('test-result-icon-fail') }),
      /** The "Message N" label a message hook's results are grouped under, 0-based */
      messageGroup: (hook: GrpcTestSectionKey, messageIndex: number) =>
        page.getByTestId(`grpc-test-section-${hook}`).getByTestId(`grpc-test-message-group-${messageIndex}`),
      /** Every "Message N" label in a section, so a per-message hook's run count can be asserted */
      messageGroups: (hook: GrpcTestSectionKey) =>
        page.getByTestId(`grpc-test-section-${hook}`).locator('[data-testid^="grpc-test-message-group-"]')
    }
  }
});

const buildLocators = (page: Page) => ({
  sidebar: buildSidebarLocators(page),
  tabs: buildRequestTabsLocators(page),
  ...buildGrpcLocators(page)
});

/**
 * Click the gRPC "Add Message" button to append a new message to the request
 * @param page - The page object
 */
export const addGrpcMessage = async (page: Page) => {
  await test.step('Add gRPC message', async () => {
    const locators = buildLocators(page);
    const messages = locators.request.messages();
    const before = await messages.count();
    await locators.request.addMessageButton().click();
    await expect(messages).toHaveCount(before + 1);
  });
};

/**
 * Click the "Generate sample" button on a gRPC message to populate it with a sample payload
 * @param page - The page object
 * @param index - The 0-based index of the message (default: 0)
 */
export const generateGrpcSampleMessage = async (page: Page, index: number = 0) => {
  await test.step(`Generate sample for gRPC message #${index}`, async () => {
    const locators = buildLocators(page);
    await locators.request.regenerateMessage(index).click();
  });
};

/**
 * Open a gRPC request from the sidebar, wait for its method to resolve, and send it.
 * Does not wait for the response — assert on it in the caller, since a call may end in a
 * status, a stream, or a script error card.
 * @param page - The page object
 * @param requestName - The name of the request in the sidebar
 * @param method - The expected method on the dropdown trigger (e.g. "HelloService/SayHello")
 */
export const sendGrpcRequest = async (page: Page, requestName: string, method: string) => {
  await test.step(`Send gRPC request "${requestName}"`, async () => {
    const locators = buildLocators(page);

    await locators.sidebar.request(requestName).click();
    await expect(locators.tabs.activeRequestTab()).toContainText(requestName, { timeout: 30000 });
    await expect(locators.method.dropdownTrigger()).toContainText(method, { timeout: 30000 });
    await locators.request.sendButton().click();
  });
};

/**
 * Send a streaming gRPC request, stream the given authored messages, then end the call and
 * wait for it to close with status 0.
 * @param page - The page object
 * @param requestName - The name of the request in the sidebar
 * @param method - The expected method on the dropdown trigger (e.g. "HelloService/BidiHello")
 * @param messageIndexes - 0-based indexes of the authored messages to stream, in order
 */
export const streamGrpcMessagesAndEndCall = async (
  page: Page,
  requestName: string,
  method: string,
  messageIndexes: number[]
) => {
  await test.step(`Stream messages [${messageIndexes.join(', ')}] on "${requestName}" and end the call`, async () => {
    const locators = buildLocators(page);

    await sendGrpcRequest(page, requestName, method);
    await expect(locators.request.endConnectionButton()).toBeVisible({ timeout: 30000 });

    for (const index of messageIndexes) {
      await locators.request.sendMessage(index).click();
    }

    await locators.request.endConnectionButton().click();
    await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
  });
};

/**
 * Open the gRPC method dropdown and select a method by name
 * @param page - The page object
 * @param methodName - The name of the gRPC method to select (e.g. "BidiHello")
 */
export const selectGrpcMethod = async (page: Page, methodName: string) => {
  await test.step(`Select gRPC method "${methodName}"`, async () => {
    const locators = buildLocators(page);
    await locators.method.dropdownTrigger().click();
    await locators.method.dropdown().waitFor({ state: 'visible', timeout: 5000 });
    await locators.method.item(methodName).first().click();
    await expect(locators.method.selectedName()).toContainText(methodName);
  });
};
