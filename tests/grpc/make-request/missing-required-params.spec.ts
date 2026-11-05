import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { buildGrpcCommonLocators } from '../../utils/page';

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('gRPC required parameters', () => {
  test('TC-793: GRPC Request with Missing Required Parameters Returns Appropriate Error', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    test.setTimeout(60000);

    const locators = buildGrpcCommonLocators(page);
    const collectionPath = collectionFixturePath!;
    const requestPath = path.join(collectionPath, 'HelloService', 'MissingMethod.bru');

    await test.step('confirm MissingMethod.bru has an empty method', async () => {
      expect(fs.readFileSync(requestPath, 'utf-8')).toMatch(/^\s*method:\s*$/m);
    });

    await test.step('open the Grpcbin collection and HelloService folder', async () => {
      await locators.sidebar.collection('Grpcbin').click();
      await locators.sidebar.folder('HelloService').click();
    });

    await test.step('select the Env environment', async () => {
      await locators.environment.selector().click();
      await locators.environment.collectionTab().click();
      await locators.environment.envOption('Env').click();
    });

    await test.step('open MissingMethod and confirm no gRPC method is selected', async () => {
      await locators.sidebar.request('MissingMethod').click();
      await expect(locators.request.queryUrlContainer()).toBeVisible();
      await expect(locators.method.selectedName()).not.toContainText('HelloService/', { timeout: 30000 });
    });

    await test.step('send MissingMethod without a gRPC method', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('show the select-a-method error and no response status', async () => {
      await expect(locators.toast.byMessage('Please select a gRPC method')).toBeVisible();
      await expect(locators.response.statusCode()).toHaveCount(0);
    });

    await test.step('save the request to clear the modified state', async () => {
      await page.keyboard.press(saveShortcut);
      await expect(locators.toast.byMessage('Request saved successfully')).toBeVisible();
    });
  });
});
