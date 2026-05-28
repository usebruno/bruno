import { expect, test } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';

const MAX_CONNECTION_TIME = 3000;
const BRU_REQ_NAME = /^ws-test-request$/;

test.describe.serial('websockets', () => {
  test('websocket requests are visible', async ({ pageWithUserData: page, restartApp }) => {
    await page.locator('#sidebar-collection-name').click();

    expect(page.locator('span.item-name').filter({ hasText: BRU_REQ_NAME })).toBeVisible();
  });

  test('websocket connects', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Attempt a connection for the specified request
    await page.getByTitle(BRU_REQ_NAME).click();
    await locators.connectionControls.connect().click();

    // See if the socket connected by monitoring the opposite state
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
  });

  test('websocket closes', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);
    await locators.connectionControls.disconnect().click();

    // See if the socket disconnected by monitoring the opposite state
    await expect(locators.connectionControls.connect()).toBeVisible();
  });

  test('websocket messages were recorded', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    // Hard validate the recieved messages to confirm the connection state
    await expect(locators.messages().first().getByText('Connected to ws://')).toBeAttached();
    await expect(locators.messages().nth(1).getByText('Closed')).toBeAttached();
  });

  test('websocket request can send messages', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    await locators.toolbar.clearResponse().click();
    await locators.runner().click();

    // Check if the messages from the request are actually displayed on the messages container
    await expect(locators.messages().nth(1).locator('.text-ellipsis')).toHaveText('{ "foo": "bar" }');
    await expect(locators.messages().nth(2).locator('.text-ellipsis')).toHaveText('{ "data": { "foo": "bar" } }');
  });
});
