import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-disabled-bru';

// Node surfaces the server's mTLS rejection as an OpenSSL handshake alert (e.g.
// "tlsv13 alert certificate required" / "sslv3 alert handshake failure"). Match the
// family of TLS/client-cert failures so an unrelated error (DNS, timeout, script) can't
// satisfy the test.
const TLS_HANDSHAKE_FAILURE = /certificate required|handshake failure|bad certificate|tlsv1.*alert|sslv3 alert|SSL alert number|SSL routines/i;

// The collection's client certificate is present but flagged `disabled: true`, so Bruno
// withholds it. The mTLS server rejects the request at the TLS handshake — the error
// surfaced in the response pane is the proof the disable flag is honored.
test.describe('https with collection client certificate (disabled, bru)', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
      const locators = buildCommonLocators(page);

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'https-request');

      await test.step('Send request and assert the TLS handshake is rejected', async () => {
        await locators.request.sendButton().click();
        await expect(locators.response.errorMessage()).toBeVisible({ timeout: 30000 });
        await expect(locators.response.errorMessage()).toHaveText(TLS_HANDSHAKE_FAILURE);
        // The failure is at the transport layer, so no HTTP response is ever received —
        // the status code slot stays free of any numeric status.
        await expect(locators.response.statusCode()).not.toHaveText(/\d/);
      });
    });
  }
});
