import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, sendAndWaitForResponse, selectResponsePaneTab } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'global-client-certs-enabled';

// The collection has no client certificate of its own — the cert is configured globally
// in Preferences (request.clientCertificates). Bruno applies the global cert to the
// matching domain, the mTLS handshake succeeds, and the request's assertions all pass.
test.describe('https with global client certificate (enabled)', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
      test.setTimeout(60 * 1000);
      const locators = buildCommonLocators(page);

      await setSandboxMode(page, COLLECTION, mode);
      await openRequest(page, COLLECTION, 'https-request');

      await sendAndWaitForResponse(page);

      await test.step('Assert all sandbox assertions passed', async () => {
        await selectResponsePaneTab(page, 'Tests');
        await expect(locators.response.assertionResults.passed()).toHaveCount(3);
        await expect(locators.response.assertionResults.failed()).toHaveCount(0);
      });
    });
  }
});
