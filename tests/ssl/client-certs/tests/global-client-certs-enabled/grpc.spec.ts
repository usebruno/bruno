import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildGrpcCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'global-client-certs-enabled';

// The collection has no client certificate of its own — the cert is configured globally
// in Preferences. Bruno applies the global cert over gRPC TLS, the mTLS handshake
// succeeds, and the unary SayHello call returns OK with the server's `(mTLS ok)` reply.
test.describe('grpc with global client certificate (enabled)', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
      const locators = buildGrpcCommonLocators(page);

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'grpc-request');

      await test.step('gRPC method is resolved from the proto file', async () => {
        await expect(locators.method.dropdownTrigger()).toContainText('HelloService/SayHello');
      });

      await test.step('Send request and assert the mTLS call succeeds', async () => {
        await locators.request.sendButton().click();
        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.statusText()).toHaveText(/OK/);
        await expect(locators.response.content()).toContainText('mTLS ok');
      });
    });
  }
});
