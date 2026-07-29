import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-enabled-bru';

// The collection carries a client certificate with `clientCertificates.enabled: true`,
// so Bruno attaches it over WSS. The WebSocket upgrade completes the mTLS handshake and
// the server replies with the peer-cert info, confirming the cert was presented.
test.describe('wss with collection client certificate (enabled, bru)', () => {
  // App launch plus the mTLS handshake exceeds the default 30s under parallel load. The budget
  // belongs on the describe so it covers fixture setup too, which test.setTimeout cannot reach.
  test.describe.configure({ timeout: 60_000 });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page).websocket;

      await setSandboxMode(page, COLLECTION, mode);
      // A request per mode: messages are stored per request, so this test's list holds only its own
      // connection. Sharing one request would leave the previous test's rows in place — including a
      // close event that lands after its socket has finished tearing down — shifting every index.
      await openRequest(page, COLLECTION, `wss-${mode}`);

      await test.step('Connect over mTLS', async () => {
        await locators.connectionControls.connect().click();
        await expect(locators.messageText(0)).toHaveText(/Connected to/);
        await expect(locators.connectionControls.disconnect()).toBeAttached();
      });

      await test.step('Send message and verify the server saw the client cert', async () => {
        await locators.runButton().click();
        await expect(locators.messageText(2)).toHaveText(/clientCertPresented"?\s*:\s*true/);
        await expect(locators.messageText(2)).toHaveText(/subjectCN"?\s*:\s*"?bruno-client/);
      });
    });
  }
});
