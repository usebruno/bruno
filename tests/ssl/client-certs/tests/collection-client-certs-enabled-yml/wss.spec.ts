import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-enabled-yml';

// The opencollection.yml declares a client certificate under `config.clientCertificates`
// (type: pem), so Bruno attaches it over WSS. The WebSocket upgrade completes the mTLS
// handshake and the server replies with the peer-cert info.
test.describe('wss with collection client certificate (enabled, yml)', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
      const locators = buildCommonLocators(page).websocket;

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'wss-request');

      await test.step('Connect over mTLS', async () => {
        await locators.connectionControls.connect().click();
        await expect(locators.connectionControls.disconnect()).toBeAttached();
      });

      await test.step('Send message and verify the server saw the client cert', async () => {
        await locators.runButton().click();
        await expect(locators.messageText(2)).toHaveText(/clientCertPresented/);
      });
    });
  }
});
