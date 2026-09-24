import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';
import { TLS_HANDSHAKE_FAILURE } from '../../../../utils/constants';

const COLLECTION = 'client-certs-disabled-yml';

// The opencollection.yml cert entry carries `disabled: true`, so Bruno withholds it. The
// mTLS server rejects the request at the TLS handshake — the error surfaced in the
// response pane is the proof the disable flag is honored on the yml parse path.
test.describe('https with collection client certificate (disabled, yml)', () => {
  // App launch plus the mTLS handshake exceeds the default 30s under parallel load. The budget
  // belongs on the describe so it covers fixture setup too, which test.setTimeout cannot reach.
  test.describe.configure({ timeout: 60_000 });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await setSandboxMode(page, COLLECTION, mode);
      // A request per mode: the response is stored per request, so opening a different one
      // leaves this test with an empty response pane. The pane cannot be cleared here — the
      // clear control is not rendered while a response carries a transport-level error.
      await openRequest(page, COLLECTION, `https-${mode}`);

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
