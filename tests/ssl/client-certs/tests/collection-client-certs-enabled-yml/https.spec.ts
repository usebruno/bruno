import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, sendAndWaitForResponse, selectResponsePaneTab } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-enabled-yml';

// The opencollection.yml declares a client certificate under `config.clientCertificates`
// (type: pem), so Bruno attaches it. The mTLS handshake succeeds and the request's
// assertions (clientCertPresented: true, subjectCN: bruno-client) all pass.
test.describe('https with collection client certificate (enabled, yml)', () => {
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
