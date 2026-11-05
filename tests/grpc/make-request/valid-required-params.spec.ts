import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { buildGrpcCommonLocators } from '../../utils/page';

test.describe('gRPC required parameters', () => {
  test('TC-789: Valid GRPC Request with Complete Required Parameters Returns Success Response', { tag: '@sanity', timeout: 90000 }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildGrpcCommonLocators(page);
    const collectionPath = collectionFixturePath!;
    const requestPath = path.join(collectionPath, 'HelloService', 'SayHello.bru');

    await test.step('confirm SayHello.bru has the required greeting', async () => {
      const requestFile = fs.readFileSync(requestPath, 'utf-8');
      expect(requestFile).toMatch(/method:\s*\/hello\.HelloService\/SayHello/);
      expect(requestFile).toContain('"greeting": "amoveo"');
    });

    await test.step('open the Grpcbin collection and HelloService folder', async () => {
      await locators.sidebar.collection('Grpcbin').click();
      await locators.sidebar.folder('HelloService').click();
    });

    await test.step('select the Env environment so the server address resolves', async () => {
      await locators.environment.selector().click();
      await locators.environment.collectionTab().click();
      await locators.environment.envOption('Env').click();
    });

    await test.step('open SayHello and confirm the request is fully formed', async () => {
      await locators.sidebar.request('SayHello').click();
      await expect(locators.request.queryUrlContainer()).toBeVisible();
      await expect(locators.method.indicator()).toContainText('gRPC');
      await expect(locators.request.messagesContainer()).toContainText('greeting');
      await expect(locators.request.messagesContainer()).toContainText('amoveo');
      await expect(locators.request.sendButton()).toBeVisible();
    });

    await test.step('confirm reflection loaded HelloService/SayHello from the server', async () => {
      await expect(locators.method.dropdownTrigger()).toContainText('HelloService/SayHello', { timeout: 30000 });
      await expect(locators.toast.byMessage(/Failed to load gRPC methods/)).toHaveCount(0);
    });

    await test.step('send the complete SayHello request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('validate the OK response and its reply field', async () => {
      await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
      await expect(locators.response.statusText()).toHaveText(/^OK$/);
      await expect(locators.response.singleResponse()).toBeVisible();
      await expect(locators.response.content()).toContainText('reply');
    });

    await test.step('verify the reply is complete', async () => {
      await expect(locators.response.content()).toContainText('hello amoveo');
      await expect(locators.response.tabCount()).toHaveText('1');
    });

    // Reflection can mark the request modified. Saving clears that so the worker can finish.
    // The button no-ops when nothing is dirty, so there is no success toast to wait for.
    await test.step('save the request to clear the modified state', async () => {
      await locators.saveButton().click();
    });
  });
});
