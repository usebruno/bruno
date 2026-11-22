import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  buildVariablesTabLocators,
  setSandboxMode,
  openRequest,
  openVariablesTab,
  sendRequest,
  expectResponseContains,
  selectResponsePaneTab
} from '../../../pages';

// "Orders" runs the login request of "Auth API" from its pre-request script. The login URL
// uses authHost, a variable only "Auth API" defines, so it resolves only with that
// collection's own settings. The login's post-response script sets `leaked`, which must not
// reach the variables of either collection in the app.
test.describe('bru.runRequest from another collection of the workspace', () => {
  test('runs the other collection\'s request and passes its response to the script', async ({ pageWithUserData: page }) => {
    const { timeline } = buildCommonLocators(page);
    const variablesTab = buildVariablesTabLocators(page);

    await test.step('Send the request whose pre-request script runs "Auth API" login', async () => {
      await setSandboxMode(page, 'Orders', 'safe');
      await openRequest(page, 'Orders', 'list-orders');
      await sendRequest(page, 200);
    });

    await test.step('The request uses the token read from the other collection\'s response', async () => {
      await expectResponseContains(page, ['orderToken', 'from-auth-api']);
    });

    await test.step('The Timeline lists the request run from the other collection', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      await expect(timeline.entries()).toHaveCount(2);

      // runRequest entries are of the "post" kind, labelled "runRequest".
      const runRequestEntry = timeline.entriesOfKind('post');
      await expect(runRequestEntry).toHaveCount(1);
      await expect(timeline.entryUrl(runRequestEntry)).toContainText('http://localhost:8081/query?token=from-auth-api');
    });

    await test.step('Variables the other collection\'s scripts set stay inside its run', async () => {
      await openVariablesTab(page, 'Orders');
      await expect(variablesTab.row('runtime', 'token')).toBeVisible();
      await expect(variablesTab.row('runtime', 'leaked')).toHaveCount(0);

      await openVariablesTab(page, 'Auth API');
      await expect(variablesTab.editor()).toBeVisible();
      await expect(variablesTab.row('runtime', 'leaked')).toHaveCount(0);
    });
  });
});
