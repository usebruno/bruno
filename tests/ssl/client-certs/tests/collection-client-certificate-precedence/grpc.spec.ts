import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, resetResponse } from '../../../../utils/page';
import { buildGrpcCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-precedence';

// Both levels declare a client certificate for `localhost`, and the global one is a
// self-signed cert the mTLS server rejects. The collection cert must win over gRPC TLS
// too: an OK unary SayHello is only reachable with the collection's trusted cert.
test.describe('grpc with collection client certificate taking precedence over global', () => {
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
