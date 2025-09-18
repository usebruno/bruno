import { test, expect, Page } from '../../playwright';

const MAX_CONNECTION_TIME = 3000;

const buildCommonLocators = (page: Page) => ({
  runner: () => page.getByTestId('run-button'),
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
  messages: () => page.locator('.ws-message').all(),
  toolbar: {
    latestFirst:() => page.getByRole('button', { name: 'Latest First' }),
    latestLast:() => page.getByRole('button', { name: 'Latest Last' }),
    clearResponse: () => page.getByRole('button', { name: 'Clear Response' })
  }
});

test.describe.serial('websockets', () => {
  test.setTimeout(2 * 10 * 1000);
  test('websocket requests are visible', async ({ pageWithUserData: page, restartApp }) => {
    await page.locator('#sidebar-collection-name').click();

    expect(page.locator('span.item-name').filter({ hasText: 'ws-test-request' })).toBeVisible();
  });

  test('websocket connects', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildCommonLocators(page);

    await page.getByTitle('ws-test-request').click();
    await locators.connectionControls.connect().click();

    await expect(locators.connectionControls.disconnect()).toBeAttached({
      timeout: MAX_CONNECTION_TIME
    });
  });

  test('websocket closes', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildCommonLocators(page);
    await locators.connectionControls.disconnect().click();

    await expect(locators.connectionControls.connect()).toBeVisible();
  });

  test('websocket messages were recorded', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildCommonLocators(page);

    const messages = await locators.messages();

    expect(messages[0].getByText('Connected to ws://')).toBeAttached();
    expect(messages[1].getByText('Closed')).toBeAttached();
  });

  test('websocket messages sorting can be changed', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildCommonLocators(page);

    await locators.toolbar.latestLast().click();

    const messages = await locators.messages();
    expect(messages[0].getByText('Closed')).toBeAttached();
    expect(messages[1].getByText('Connected to ws://')).toBeAttached();

    await locators.toolbar.latestFirst().click();
    const messagesReset = await locators.messages();
    expect(messagesReset[0].getByText('Connected to ws://')).toBeAttached();
    expect(messagesReset[1].getByText('Closed')).toBeAttached();
  });

  test('websocket request can send messages', async ({ pageWithUserData: page, restartApp }) => {
    const locators = buildCommonLocators(page);
    
    await locators.toolbar.clearResponse().click()
    await locators.runner().click()
  
    const messages = await locators.messages();

    expect(
      await messages[1]
        .locator('.text-ellipsis')
        .innerText()
      ).toMatch('{ "foo": "bar" }')

    
    expect(
      await messages[2]
        .locator('.text-ellipsis')
        .innerText()
      ).toMatch('{ "data": { "foo": "bar" } }')
  });

});
