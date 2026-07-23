import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'global-client-certs-disabled';

// The global client certificate in Preferences carries `disabled: true`, so Bruno
// withholds it. The mTLS server rejects the request at the TLS handshake — the error
// surfaced in the response pane is the proof the global disable flag is honored.
test.describe('https with global client certificate (disabled)', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
      const locators = buildCommonLocators(page);

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'https-request');

      await test.step('Send request and assert the TLS handshake is rejected', async () => {
        await locators.request.sendButton().click();
        await expect(locators.response.errorMessage()).toBeVisible({ timeout: 30000 });
      });
    });
  }
});
