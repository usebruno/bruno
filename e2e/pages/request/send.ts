import { test, expect, Page } from '../../playwright';
import { buildResponseLocators, buildResponseErrorsLocators } from '../response/pane';

/**
 * Locators for sending a request from the request pane.
 */
export const buildRequestSendLocators = (page: Page) => ({
  sendButton: () => page.getByTestId('send-arrow-icon')
});

const buildLocators = (page: Page) => ({
  request: buildRequestSendLocators(page),
  response: buildResponseLocators(page)
});

/**
 * Send the current request and wait for response
 * @param page - The page object
 * @param expectedStatusCode - Optional expected status code to wait for
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns void
 */
export const sendRequest = async (
  page: Page,
  expectedStatusCode?: number,
  timeout: number = 30000
) => {
  await test.step('Send request', async () => {
    await page.getByTestId('send-arrow-icon').click();
    await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout });

    if (expectedStatusCode !== undefined) {
      await expect(page.getByTestId('response-status-code')).toContainText(
        String(expectedStatusCode),
        { timeout }
      );
    }
  });
};

/**
* Send a request and wait for the response
 * @param page - The page object
 * @param expectedStatusCode - The expected status code (default: 200)
 * @param options - The options for sending the request (default: { timeout: 15000 })
 */
export const sendRequestAndWaitForResponse = async (page: Page,
  expectedStatusCode: number = 200,
  options: {
    ignoreCase?: boolean;
    timeout?: number;
    useInnerText?: boolean;
  } = { timeout: 15000 }) => {
  await test.step(`Send request and wait for status code ${expectedStatusCode}`, async () => {
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText(String(expectedStatusCode), options);
  });
};

/**
 * Click send and wait for at least one error card to appear.
 * @param page - The page object
 */
export const sendAndWaitForErrorCard = async (page: Page) => {
  await test.step('Send request and wait for error card', async () => {
    const { request } = buildLocators(page);
    const responseErrorsLocators = buildResponseErrorsLocators(page);
    await request.sendButton().click();
    await responseErrorsLocators.card().waitFor({ state: 'visible', timeout: 15000 });
  });
};

/**
 * Click send and wait for a response status code to appear.
 * Used for requests that succeed at HTTP level but may have post-response/test errors.
 * @param page - The page object
 */
export const sendAndWaitForResponse = async (page: Page) => {
  await test.step('Send request and wait for response', async () => {
    const { request, response } = buildLocators(page);
    await request.sendButton().click();
    await response.statusCode().waitFor({ state: 'visible', timeout: 15000 });
  });
};
