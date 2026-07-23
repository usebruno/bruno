import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-disabled-bru';

// The collection's client certificate is present but flagged `disabled: true`, so Bruno
// withholds it over WSS. The WebSocket upgrade fails the mTLS handshake — the connection
// never reaches CONNECTED and an error entry appears in the message list.
test.describe('wss with collection client certificate (disabled, bru)', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
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
