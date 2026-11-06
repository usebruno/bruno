import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators, closeAllOpenTabs, selectEnvironment } from '../../utils/page';

const reflectionTimeout = 30000;

test.describe('gRPC request without a method', () => {
  test('TC-793: sending a gRPC request with no method selected shows a select-method error', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const locators = buildGrpcCommonLocators(page);

    await test.step('open the Grpcbin collection and HelloService folder', async () => {
      await locators.sidebar.collection('Grpcbin').click();
      await locators.sidebar.folder('HelloService').click();
    });

    await selectEnvironment(page, 'Env');

    await test.step('open MissingMethod and wait for reflection to leave no method selected', async () => {
      await locators.sidebar.request('MissingMethod').click();
      await expect(locators.method.selectedName()).toHaveText('Select Method', { timeout: reflectionTimeout });
    });

    await test.step('send the request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('show the select-a-method error and no response status', async () => {
      await expect(locators.toast.byMessage('Please select a gRPC method')).toBeVisible();
      await expect(locators.response.statusCode()).toHaveCount(0);
    });

    // Reflection may leave a draft, which would block the app from quitting cleanly at teardown.
    await closeAllOpenTabs(page);
  });
});
