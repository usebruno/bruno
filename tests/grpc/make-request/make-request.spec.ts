import { test, expect } from '../../../playwright';

test.describe('make grpc requests', () => {
  const setupGrpcTest = async (page) => {
    await test.step('navigate to gRPC collection', async () => {
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Grpcbin' }).click();
      await page.locator('.collection-item-name').getByText('HelloService').click();
    });

    await test.step('select environment', async () => {
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-collection').click();
      await page.locator('.dropdown-item').getByText('Env', { exact: true }).click();
    });
  };

  test('make unary request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);

    await test.step('select unary method', async () => {
      await page.locator('.collection-item-name').getByText('SayHello').click();
      const methodDropdownTrigger = page.getByTestId('grpc-method-dropdown-trigger');
      await expect(methodDropdownTrigger).toContainText('HelloService/SayHello');
    });

    await test.step('verify gRPC unary request is opened successfully', async () => {
      await expect(page.getByTestId('grpc-method-indicator')).toContainText('gRPC');
      await expect(page.getByTestId('grpc-query-url-container').locator('.CodeMirror')).toBeVisible();
      await expect(page.getByTestId('grpc-send-request-button')).toBeVisible();
      await expect(page.getByTestId('grpc-messages-container')).toBeVisible();
    });

    await test.step('send request', async () => {
      await page.getByTestId('grpc-send-request-button').click();
      const statusCode = page.getByTestId('grpc-response-status-code');
      const statusText = page.getByTestId('grpc-response-status-text');
      await expect(statusCode).toBeVisible({ timeout: 2000 });
      await expect(statusText).toBeVisible({ timeout: 2000 });
      await expect(statusCode).toHaveText(/0/);
      await expect(statusText).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(page.getByTestId('tab-response-count')).toHaveText('1');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(page.getByTestId('grpc-response-content')).toBeVisible();
      await expect(page.getByTestId('grpc-responses-container')).toBeVisible();
      await expect(page.getByTestId('grpc-single-response')).toBeVisible();
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });

  test('make server streaming request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);

    await test.step('select server streaming method', async () => {
      await page.locator('.collection-item-name').getByText('LotOfReplies').click();
      await expect(page.getByTestId('grpc-method-dropdown-trigger')).toContainText('HelloService/LotsOfReplies');
    });

    await test.step('verify gRPC server streaming request is opened successfully', async () => {
      await expect(page.getByTestId('grpc-method-indicator')).toContainText('gRPC');
      await expect(page.getByTestId('grpc-query-url-container').locator('.CodeMirror')).toBeVisible();
      await expect(page.getByTestId('grpc-messages-container')).toBeVisible();
      await expect(page.getByTestId('grpc-send-request-button')).toBeVisible();
      await expect(page.getByTestId('grpc-messages-container')).toBeVisible();
    });

    await test.step('send request', async () => {
      await page.getByTestId('grpc-send-request-button').click();
      const statusCode = page.getByTestId('grpc-response-status-code');
      const statusText = page.getByTestId('grpc-response-status-text');
      await expect(statusCode).toBeVisible({ timeout: 2000 });
      await expect(statusText).toBeVisible({ timeout: 2000 });
      await expect(statusCode).toHaveText(/0/);
      await expect(statusText).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(page.getByTestId('tab-response-count')).toHaveText('10');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(page.getByTestId('grpc-response-content')).toBeVisible();
      await expect(page.getByTestId('grpc-responses-container')).toBeVisible();
      await expect(page.getByTestId('grpc-responses-accordion')).toBeVisible();
      const responseItems = page.locator('[data-testid^="grpc-response-item-"]');
      await expect(responseItems).toHaveCount(10);
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });

  test('make client streaming request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);

    await test.step('select client streaming method', async () => {
      await page.locator('.collection-item-name').getByText('LotOfGreetings').click();
      await expect(page.getByTestId('grpc-method-dropdown-trigger')).toContainText('HelloService/LotsOfGreetings');
    });

    await test.step('verify gRPC client streaming request is opened successfully', async () => {
      await expect(page.getByTestId('grpc-query-url-container').locator('.CodeMirror')).toBeVisible();
      await expect(page.getByTestId('grpc-messages-container')).toBeVisible();
      await expect(page.getByTestId('grpc-add-message-button')).toBeVisible();
      await expect(page.getByTestId('grpc-send-message-0')).toBeVisible();
      await expect(page.getByTestId('grpc-send-request-button')).toBeVisible();
    });

    await test.step('start client streaming connection', async () => {
      await page.getByTestId('grpc-send-request-button').click();
      await expect(page.getByTestId('grpc-end-connection-button')).toBeVisible();
    });

    await test.step('send individual message', async () => {
      await page.getByTestId('grpc-send-message-0').click();
    });

    await test.step('end client streaming connection', async () => {
      await page.getByTestId('grpc-end-connection-button').click();
      const statusCode = page.getByTestId('grpc-response-status-code');
      const statusText = page.getByTestId('grpc-response-status-text');
      await expect(statusCode).toBeVisible({ timeout: 2000 });
      await expect(statusText).toBeVisible({ timeout: 2000 });
      await expect(statusCode).toHaveText(/0/);
      await expect(statusText).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(page.getByTestId('tab-response-count')).toHaveText('1');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(page.getByTestId('grpc-response-content')).toBeVisible();
      await expect(page.getByTestId('grpc-responses-container')).toBeVisible();
      await expect(page.getByTestId('grpc-single-response')).toBeVisible();
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });

  test('make bidi streaming request', async ({ pageWithUserData: page }) => {
    await setupGrpcTest(page);

    await test.step('select bidirectional streaming method', async () => {
      await page.locator('.collection-item-name').getByText('BidiHello').click();
      await expect(page.getByTestId('grpc-method-dropdown-trigger')).toContainText('HelloService/BidiHello');
    });

    await test.step('verify gRPC bidi streaming request is opened successfully', async () => {
      await expect(page.getByTestId('grpc-query-url-container').locator('.CodeMirror')).toBeVisible();
      await expect(page.getByTestId('grpc-messages-container')).toBeVisible();
      await expect(page.getByTestId('grpc-add-message-button')).toBeVisible();
      await expect(page.getByTestId('grpc-send-message-0')).toBeVisible();
      await expect(page.getByTestId('grpc-send-request-button')).toBeVisible();
    });

    await test.step('start bidirectional streaming connection', async () => {
      await page.getByTestId('grpc-send-request-button').click();
      await expect(page.getByTestId('grpc-end-connection-button')).toBeVisible();
    });

    await test.step('send individual message', async () => {
      await page.getByTestId('grpc-send-message-0').click();
      await page.getByTestId('grpc-send-message-1').click();
    });

    await test.step('end bidirectional streaming connection', async () => {
      await page.getByTestId('grpc-end-connection-button').click();
      const statusCode = page.getByTestId('grpc-response-status-code');
      const statusText = page.getByTestId('grpc-response-status-text');
      await expect(statusCode).toBeVisible({ timeout: 2000 });
      await expect(statusText).toBeVisible({ timeout: 2000 });
      await expect(statusCode).toHaveText(/0/);
      await expect(statusText).toHaveText(/OK/);
    });

    await test.step('verify response message count', async () => {
      await expect(page.getByTestId('tab-response-count')).toHaveText('2');
    });

    await test.step('verify response items are rendered', async () => {
      await expect(page.getByTestId('grpc-response-content')).toBeVisible();
      await expect(page.getByTestId('grpc-responses-container')).toBeVisible();
      await expect(page.getByTestId('grpc-responses-accordion')).toBeVisible();
      const responseItems = page.locator('[data-testid^="grpc-response-item-"]');
      await expect(responseItems).toHaveCount(2);
    });

    /* TODO: Reflection fetching incorrectly marks requests as modified, causing save indicators to appear. This save step prevents test timeouts by clearing the modified state. This is a temporary workaround until the reflection fetching issue is resolved. */
    await test.step('save request via shortcut', async () => {
      await page.keyboard.press('Meta+s');
    });
  });
});
