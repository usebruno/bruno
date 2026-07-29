import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-disabled-yml';

// The opencollection.yml cert entry carries `disabled: true`, so Bruno withholds it over
// WSS. The WebSocket upgrade fails the mTLS handshake — the connection never reaches
// CONNECTED and an error entry appears in the message list.
test.describe('wss with collection client certificate (disabled, yml)', () => {
  // App launch plus the mTLS handshake exceeds the default 30s under parallel load. The budget
  // belongs on the describe so it covers fixture setup too, which test.setTimeout cannot reach.
  test.describe.configure({ timeout: 60_000 });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page).websocket;

      await setSandboxMode(page, COLLECTION, mode);
      // A request per mode: messages are stored per request, so the error row this test asserts on
      // can only be its own. Sharing one request would leave the previous test's error row in the
      // list, satisfying the assertion before this connection is even attempted.
      await openRequest(page, COLLECTION, `wss-${mode}`);

      await test.step('Connect and assert the handshake is rejected', async () => {
        await locators.connectionControls.connect().click();
        await expect(locators.errorMessage()).toBeVisible({ timeout: 30000 });
        await expect(locators.connectionControls.disconnect()).toHaveCount(0);
      });
    });
  }
});
