import { test, expect } from '../../../../../playwright';
import { setSandboxMode, openRequest, sendAndWaitForResponse, selectResponsePaneTab, resetResponse } from '../../../../utils/page';
import { buildCommonLocators } from '../../../../utils/page/locators';

const COLLECTION = 'client-certs-enabled-bru';

// The collection carries a client certificate with `clientCertificates.enabled: true`,
// so Bruno attaches it. The mTLS handshake succeeds and the request's assertions
// (clientCertPresented: true, subjectCN: bruno-client) all pass.
test.describe('https with collection client certificate (enabled, bru)', () => {
  // App launch plus the mTLS handshake exceeds the default 30s under parallel load. The budget
  // belongs on the describe so it covers fixture setup too, which test.setTimeout cannot reach.
  test.describe.configure({ timeout: 60_000 });

  // tests in this file share one app instance — hand the next test an empty response pane,
  // so its assertions cannot be satisfied by the previous test's response
  test.afterEach(async ({ pageWithUserData: page }) => {
    await resetResponse(page);
  });

  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode`, async ({ pageWithUserData: page }) => {
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
