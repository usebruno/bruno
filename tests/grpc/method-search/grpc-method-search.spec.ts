import { test, expect } from '../../../playwright';

test.describe('Grpc Collection - Method Search Functionality', () => {
  test.beforeAll(async ({ pageWithUserData: page }) => {
    await test.step('Open the grpc-collection in the sidebar', async () => {
      await page.locator('#sidebar-collection-name').filter({ hasText: 'grpc-collection' }).click();
    });

    await test.step('Switch to GrpcEnv environment', async () => {
      await page.locator('div.current-environment').click();
      await page.getByText('GrpcEnv').click();
      await expect(page.locator('.current-environment').filter({ hasText: /GrpcEnv/ })).toBeVisible();
    });
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await test.step('Close the gRPC sayHello tab without saving changes', async () => {
      await page.getByRole('tab', { name: 'gRPC sayHello' }).getByRole('img').click();
      await page.getByRole('button', { name: 'Don\'t Save' }).click();
    });
  });

  test('Search for grpc methods using the search input', async ({ pageWithUserData: page }) => {
    await test.step('Select SayHello request', async () => {
      await page.getByText('SayHello').click();
    });

    await test.step('Wait for gRPC query URL container to be visible', async () => {
      const grpcQueryUrlContainer = page.getByTestId('grpc-query-url-container');
      await grpcQueryUrlContainer.waitFor({ state: 'visible' });
    });

    await test.step('Refresh gRPC methods and open methods dropdown', async () => {
      await page.getByTestId('refresh-methods-icon').click();
      const grpcMethodsDropdown = page.getByTestId('grpc-methods-dropdown');
      await grpcMethodsDropdown.click();
    });

    await test.step('Search the term "Loojup" and verify the "Lookup" grpc method is visible and select it', async () => {
      await page.getByTestId('grpc-methods-search-input').fill('loojup');
      const method = page.getByTestId('grpc-method-item').filter({ hasText: 'Lookup' });
      await expect(method).toBeVisible();
      await method.click();
    });

    await test.step('Verify the "Lookup" grpc method is selected', async () => {
      const method = page.getByTestId('selected-grpc-method-name').filter({ hasText: 'Lookup' });
      await expect(method).toBeVisible();
    });
  });

  test('Search for grpc methods using the keyboard', async ({ pageWithUserData: page }) => {
    await test.step('Select SayHello request', async () => {
      await page.getByText('SayHello').click();
    });

    await test.step('Wait for gRPC query URL container to be visible', async () => {
      const grpcQueryUrlContainer = page.getByTestId('grpc-query-url-container');
      await grpcQueryUrlContainer.waitFor({ state: 'visible' });
    });

    await test.step('Refresh gRPC methods and open methods dropdown', async () => {
      await page.getByTestId('refresh-methods-icon').click();
      const grpcMethodsDropdown = page.getByTestId('grpc-methods-dropdown');
      await grpcMethodsDropdown.click();
    });

    await test.step('Use keyboard to navigate to "Sum" method and select it', async () => {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    });

    await test.step('Verify the "Sum" grpc method is selected', async () => {
      const method = page.getByTestId('selected-grpc-method-name').filter({ hasText: 'Add/Sum' });
      await expect(method).toBeVisible();
    });
  });
});
