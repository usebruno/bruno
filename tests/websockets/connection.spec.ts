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

    const messages = await locators.messages();

    // Hard validate the recieved messages to confirm the connection state
    expect(messages[0].getByText('Connected to ws://')).toBeAttached();
    expect(messages[1].getByText('Closed')).toBeAttached();
  });

  test('websocket messages sorting can be changed', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    await locators.toolbar.latestLast().click();

    // check the current order of the messages where the latest message is last
    const messages = await locators.messages();
    expect(messages[0].getByText('Closed')).toBeAttached();
    expect(messages[1].getByText('Connected to ws://')).toBeAttached();

    await locators.toolbar.latestFirst().click();
    const messagesReset = await locators.messages();

    // check the current order of the messages where the latest message is first
    expect(messagesReset[0].getByText('Connected to ws://')).toBeAttached();
    expect(messagesReset[1].getByText('Closed')).toBeAttached();
  });

  test('websocket request can send messages', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildWebsocketCommonLocators(page);

    await locators.toolbar.clearResponse().click();
    await locators.runner().click();

    const messages = await locators.messages();

    // Check if the messages from the request are actually displayed on the messages container
    expect(await messages[1].locator('.text-ellipsis').innerText()).toMatch('{ "foo": "bar" }');
    expect(await messages[2].locator('.text-ellipsis').innerText()).toMatch('{ "data": { "foo": "bar" } }');
  });
});
