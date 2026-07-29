import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, resetWsResponse } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-disabled-yml';

// The opencollection.yml cert entry carries `disabled: true`, so Bruno withholds it over
// WSS. The WebSocket upgrade fails the mTLS handshake — the connection never reaches
// CONNECTED and an error entry appears in the message list.
test.describe('wss with collection client certificate (disabled, yml)', () => {
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

      await test.step('Connect and assert the handshake is rejected', async () => {
        await locators.connectionControls.connect().click();
        await expect(locators.errorMessage()).toBeVisible({ timeout: 30000 });
        await expect(locators.connectionControls.disconnect()).toHaveCount(0);
      });
    });
  }
});
