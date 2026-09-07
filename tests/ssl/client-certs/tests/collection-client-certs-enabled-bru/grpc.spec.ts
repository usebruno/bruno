import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, resetResponse } from '../../../../utils/page';
import { buildGrpcCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-enabled-bru';

// The collection carries a client certificate with `clientCertificates.enabled: true`,
// so Bruno attaches it over gRPC TLS. The mTLS handshake succeeds and the unary
// SayHello call returns OK with the server's `(mTLS ok)` reply.
test.describe('grpc with collection client certificate (enabled, bru)', () => {
  // App launch plus the mTLS handshake exceeds the default 30s under parallel load. The budget
  // belongs on the describe so it covers fixture setup too, which test.setTimeout cannot reach.
  test.describe.configure({ timeout: 60_000 });

  // tests in this file share one app instance — hand the next test an empty response pane,
  // so its assertions cannot be satisfied by the previous test's response
  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetResponse(page);
  });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
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
