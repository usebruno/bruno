import { expect, test } from '../../playwright';
import { buildWebsocketCommonLocators } from '../utils/page/locators';
import { closeAllCollections } from '../utils/page';

const MAX_CONNECTION_TIME = 10000;
const BRU_REQ_NAME = /^ws-test-request$/;

test.describe('websockets', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('websocket requests basics', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);

    await test.step('websocket requests are visible', async () => {
      await page.locator('#sidebar-collection-name').click();
      expect(page.locator('span.item-name').filter({ hasText: BRU_REQ_NAME })).toBeVisible();
    });

    await test.step('websocket connects', async () => {
    // Attempt a connection for the specified request
      await page.getByTitle(BRU_REQ_NAME).click();
      await locators.connectionControls.connect().click();

      // See if the socket connected by monitoring the opposite state
      await expect(locators.connectionControls.disconnect()).toBeAttached({
        timeout: MAX_CONNECTION_TIME
      });
    });

    await test.step('websocket closes', async () => {
      await locators.connectionControls.disconnect().click();
      // See if the socket disconnected by monitoring the opposite state
      await expect(locators.connectionControls.connect()).toBeVisible();
    });
  });

  test('websocket messages were recorded', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);
    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_REQ_NAME).click();

    await locators.connectionControls.connect().click();
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
    await locators.connectionControls.disconnect().click();
    // Hard validate the recieved messages to confirm the connection state
    await expect(locators.messages().first().getByText('Connected to ws://')).toBeAttached();
    await expect(locators.messages().nth(1).getByText('Closed')).toBeAttached();
  });

  test('websocket messages sorting can be changed', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);
    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_REQ_NAME).click();

    await locators.connectionControls.connect().click();
    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
    await locators.connectionControls.disconnect().click();

    await locators.toolbar.latestLast().click();

    await expect(locators.messages().first().getByText('Closed')).toBeAttached();
    await expect(locators.messages().nth(1).getByText('Connected to ws://')).toBeAttached();

    await locators.toolbar.latestFirst().click();

    await expect(locators.messages().first().getByText('Connected to ws://')).toBeAttached();
    await expect(locators.messages().nth(1).getByText('Closed')).toBeAttached();
  });

  test('websocket request can send messages', async ({ pageWithUserData: page }) => {
    const locators = buildWebsocketCommonLocators(page);

    await page.locator('#sidebar-collection-name').click();
    await page.getByTitle(BRU_REQ_NAME).click();

    await locators.runner().click();

    // Check if the messages from the request are actually displayed on the messages container
    await expect(locators.messages().nth(1).locator('.text-ellipsis')).toHaveText('{ "foo": "bar" }');
    await expect(locators.messages().nth(2).locator('.text-ellipsis')).toHaveText('{ "data": { "foo": "bar" } }');
  });
});
