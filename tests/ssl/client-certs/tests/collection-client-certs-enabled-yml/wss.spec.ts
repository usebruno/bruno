import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, disconnectWs } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-enabled-yml';

// The opencollection.yml declares a client certificate under `config.clientCertificates`
// (type: pem), so Bruno attaches it over WSS. The WebSocket upgrade completes the mTLS
// handshake and the server replies with the peer-cert info.
test.describe('wss with collection client certificate (enabled, yml)', () => {
  // App launch plus the mTLS handshake exceeds the default 30s under parallel load. The budget
  // belongs on the describe so it covers fixture setup too, which test.setTimeout cannot reach.
  test.describe.configure({ timeout: 60_000 });

  // tests in this file share one app instance and one request — leave the next test a closed
  // connection, or the connect button it clicks is not rendered
  test.afterEach(async ({ pageWithUserData: page }) => {
    await disconnectWs(page);
  });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page).websocket;

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'wss-request');

      await test.step('Connect over mTLS', async () => {
        await locators.connectionControls.connect().click();
        await expect(locators.messageMatching(/Connected to/)).toBeAttached();
        await expect(locators.connectionControls.disconnect()).toBeAttached();
      });

      await test.step('Send message and verify the server saw the client cert', async () => {
        await locators.runButton().click();
        // Match the reply by content rather than by position: the assertion is about what the
        // server saw, and Bruno records an outgoing message only once its write completes, so the
        // reply can be listed above the ping that triggered it.
        const certReply = locators.messageMatching(/clientCertPresented/);
        await expect(certReply).toHaveText(/clientCertPresented"?\s*:\s*true/);
        await expect(certReply).toHaveText(/subjectCN"?\s*:\s*"?bruno-client/);
      });
    });
  }
});
