import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildGrpcCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-disabled-bru';

// The collection's client certificate is present but flagged `disabled: true`, so Bruno
// withholds it over gRPC TLS. The server rejects the connection at the handshake and the
// call fails with a non-OK status.
test.describe('grpc with collection client certificate (disabled, bru)', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
      const locators = buildGrpcCommonLocators(page);

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'grpc-request');

      await test.step('gRPC method is resolved from the proto file', async () => {
        await expect(locators.method.dropdownTrigger()).toContainText('HelloService/SayHello');
      });

      await test.step('Send request and assert the call fails at the TLS handshake', async () => {
        await locators.request.sendButton().click();
        await expect(locators.response.statusCode()).toBeVisible({ timeout: 30000 });
        await expect(locators.response.statusCode()).toHaveText(/14/);
        await expect(locators.response.statusText()).toHaveText(/UNAVAILABLE/);
      });
    });
  }
});
