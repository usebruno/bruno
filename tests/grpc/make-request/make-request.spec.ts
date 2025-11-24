import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators } from '../../utils/page/locators';

test.describe('make grpc requests', () => {
  const setupGrpcTest = async (page) => {
    const locators = buildGrpcCommonLocators(page);

    await test.step('navigate to gRPC collection', async () => {
      await locators.sidebar.collection('Grpcbin').click();
      await locators.sidebar.folder('HelloService').click();
    });

    await test.step('select environment', async () => {
      await locators.environment.selector().click();
      await locators.environment.collectionTab().click();
      await locators.environment.envOption('Env').click();
    });
  };

  test('make unary request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);
    const locators = buildGrpcCommonLocators(page);

    await test.step('select unary method', async () => {
      await locators.sidebar.request('SayHello').click();
      await expect(locators.method.dropdownTrigger()).toContainText('HelloService/SayHello');
    });

    await test.step('verify gRPC unary request is opened successfully', async () => {
      await expect(locators.method.indicator()).toContainText('gRPC');
      await expect(locators.request.queryUrlContainer().locator('.CodeMirror')).toBeVisible();
      await expect(locators.request.sendButton()).toBeVisible();
      await expect(locators.request.messagesContainer()).toBeVisible();
    });

    await test.step('send request', async () => {
      await locators.request.sendButton().click();
      await expect(locators.response.statusCode()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusText()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusCode()).toHaveText(/0/);
      await expect(locators.response.statusText()).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(locators.response.tabCount()).toHaveText('1');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(locators.response.content()).toBeVisible();
      await expect(locators.response.container()).toBeVisible();
      await expect(locators.response.singleResponse()).toBeVisible();
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });

  test('make server streaming request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);
    const locators = buildGrpcCommonLocators(page);

    await test.step('select server streaming method', async () => {
      await locators.sidebar.request('LotOfReplies').click();
      await expect(locators.method.dropdownTrigger()).toContainText('HelloService/LotsOfReplies');
    });

    await test.step('verify gRPC server streaming request is opened successfully', async () => {
      await expect(locators.method.indicator()).toContainText('gRPC');
      await expect(locators.request.queryUrlContainer().locator('.CodeMirror')).toBeVisible();
      await expect(locators.request.messagesContainer()).toBeVisible();
      await expect(locators.request.sendButton()).toBeVisible();
    });

    await test.step('send request', async () => {
      await locators.request.sendButton().click();
      await expect(locators.response.statusCode()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusText()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusCode()).toHaveText(/0/);
      await expect(locators.response.statusText()).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(locators.response.tabCount()).toHaveText('10');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(locators.response.content()).toBeVisible();
      await expect(locators.response.container()).toBeVisible();
      await expect(locators.response.accordion()).toBeVisible();
      await expect(locators.response.responseItems()).toHaveCount(10);
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });

  test('make client streaming request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);
    const locators = buildGrpcCommonLocators(page);

    await test.step('select client streaming method', async () => {
      await locators.sidebar.request('LotOfGreetings').click();
      await expect(locators.method.dropdownTrigger()).toContainText('HelloService/LotsOfGreetings');
    });

    await test.step('verify gRPC client streaming request is opened successfully', async () => {
      await expect(locators.request.queryUrlContainer().locator('.CodeMirror')).toBeVisible();
      await expect(locators.request.messagesContainer()).toBeVisible();
      await expect(locators.request.addMessageButton()).toBeVisible();
      await expect(locators.request.sendMessage(0)).toBeVisible();
      await expect(locators.request.sendButton()).toBeVisible();
    });

    await test.step('start client streaming connection', async () => {
      await locators.request.sendButton().click();
      await expect(locators.request.endConnectionButton()).toBeVisible();
    });

    await test.step('send individual message', async () => {
      await locators.request.sendMessage(0).click();
    });

    await test.step('end client streaming connection', async () => {
      await locators.request.endConnectionButton().click();
      await expect(locators.response.statusCode()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusText()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusCode()).toHaveText(/0/);
      await expect(locators.response.statusText()).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(locators.response.tabCount()).toHaveText('1');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(locators.response.content()).toBeVisible();
      await expect(locators.response.container()).toBeVisible();
      await expect(locators.response.singleResponse()).toBeVisible();
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });

  test('make bidi streaming request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);
    const locators = buildGrpcCommonLocators(page);

    await test.step('select bidirectional streaming method', async () => {
      await locators.sidebar.request('BidiHello').click();
      await expect(locators.method.dropdownTrigger()).toContainText('HelloService/BidiHello');
    });

    await test.step('verify gRPC bidi streaming request is opened successfully', async () => {
      await expect(locators.request.queryUrlContainer().locator('.CodeMirror')).toBeVisible();
      await expect(locators.request.messagesContainer()).toBeVisible();
      await expect(locators.request.addMessageButton()).toBeVisible();
      await expect(locators.request.sendMessage(0)).toBeVisible();
      await expect(locators.request.sendButton()).toBeVisible();
    });

    await test.step('start bidirectional streaming connection', async () => {
      await locators.request.sendButton().click();
      await expect(locators.request.endConnectionButton()).toBeVisible();
    });

    await test.step('send individual message', async () => {
      await locators.request.sendMessage(0).click();
      await locators.request.sendMessage(1).click();
    });

    await test.step('end bidirectional streaming connection', async () => {
      await locators.request.endConnectionButton().click();
      await expect(locators.response.statusCode()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusText()).toBeVisible({ timeout: 2000 });
      await expect(locators.response.statusCode()).toHaveText(/0/);
      await expect(locators.response.statusText()).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(locators.response.tabCount()).toHaveText('2');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(locators.response.content()).toBeVisible();
      await expect(locators.response.container()).toBeVisible();
      await expect(locators.response.accordion()).toBeVisible();
      await expect(locators.response.responseItems()).toHaveCount(2);
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });
});
