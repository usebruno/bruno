import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, disconnectWs } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'global-client-certs-disabled';

// The global client certificate in Preferences carries `disabled: true`, so Bruno
// withholds it over WSS. The WebSocket upgrade fails the mTLS handshake — the connection
// never reaches CONNECTED and an error entry appears in the message list.
test.describe('wss with global client certificate (disabled)', () => {
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

      await test.step('Connect and assert the handshake is rejected', async () => {
        await locators.connectionControls.connect().click();
        await expect(locators.errorMessage()).toBeVisible({ timeout: 30000 });
        await expect(locators.connectionControls.disconnect()).toHaveCount(0);
      });
    });
  }
});
