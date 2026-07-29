import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, resetWsResponse } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'global-client-certs-enabled';

// The collection has no client certificate of its own — the cert is configured globally
// in Preferences. Bruno applies the global cert over WSS, the upgrade completes the mTLS
// handshake, and the server replies with the peer-cert info.
test.describe('wss with global client certificate (enabled)', () => {
  // App launch plus the mTLS handshake exceeds the default 30s under parallel load. The budget
  // belongs on the describe so it covers fixture setup too, which test.setTimeout cannot reach.
  test.describe.configure({ timeout: 60_000 });

  // tests in this file share one app instance — hand the next test a closed connection and an empty message list
  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetWsResponse(page);
  });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page).websocket;

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'wss-request');

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
