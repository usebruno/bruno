import { test, expect, type Page } from '../../../playwright';

/** Wait for reflection to finish, then open the methods dropdown. */
const refreshAndOpenMethods = async (page: Page) => {
  await page.getByTestId('refresh-methods-icon').click();
  const loaded = page.getByText(/Loaded \d+ gRPC methods from reflection/);
  await expect(loaded).toBeVisible({ timeout: 30000 });
  await expect(loaded).toBeHidden();

  await page.getByTestId('grpc-methods-dropdown').click();
  await expect(page.getByTestId('grpc-methods-list')).toBeVisible();
};

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
      const tab = page.getByRole('tab', { name: 'gRPC sayHello' });
      if (!(await tab.isVisible().catch(() => false))) return;
      await tab.getByTestId('request-tab-close-icon').click({ force: true });
      const dontSave = page.getByRole('button', { name: 'Don\'t Save' });
      if (await dontSave.isVisible().catch(() => false)) {
        await dontSave.click();
      }
    });
  });

  test('Search for grpc methods using the search input', async ({ pageWithUserData: page }) => {
    await test.step('Select SayHello request', async () => {
      await page.getByText('SayHello').click();
    });

    await test.step('Wait for gRPC query URL container to be visible', async () => {
      await page.getByTestId('grpc-query-url-container').waitFor({ state: 'visible' });
    });

    await test.step('Refresh gRPC methods and open methods dropdown', async () => {
      await refreshAndOpenMethods(page);
    });

    await test.step('Search the term "Loojup" and verify the "Lookup" grpc method is visible and select it', async () => {
      await page.getByTestId('grpc-methods-search-input').fill('loojup');
      const method = page.getByTestId('grpc-method-item').filter({ hasText: 'Lookup' });
      await expect(method).toBeVisible();
      await method.click();
    });

    await test.step('Verify the "Lookup" grpc method is selected', async () => {
      await expect(page.getByTestId('selected-grpc-method-name')).toContainText('Lookup');
    });
  });

  test('Search for grpc methods using the keyboard', async ({ pageWithUserData: page }) => {
    await test.step('Select SayHello request', async () => {
      await page.getByText('SayHello').click();
    });

    await test.step('Wait for gRPC query URL container to be visible', async () => {
      await page.getByTestId('grpc-query-url-container').waitFor({ state: 'visible' });
    });

    await test.step('Refresh gRPC methods and open methods dropdown', async () => {
      await refreshAndOpenMethods(page);
    });

    await test.step('Use keyboard to navigate to "Sum" method and select it', async () => {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    });

    await test.step('Verify the "Sum" grpc method is selected', async () => {
      await expect(page.getByTestId('selected-grpc-method-name')).toContainText('Add/Sum');
    });
  });
});
