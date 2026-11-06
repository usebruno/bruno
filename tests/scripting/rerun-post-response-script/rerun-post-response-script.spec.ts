import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  buildResponseErrorsLocators,
  openRequest,
  selectResponsePaneTab,
  selectScriptSubTab,
  sendRequest,
  setCodeMirrorEditorValue,
  setSandboxMode
} from '../../utils/page';

const COLLECTION = 'rerun-post-response-script';

const setPostResponseScript = async (page: Page, script: string) => {
  await selectScriptSubTab(page, 'post-response');
  await setCodeMirrorEditorValue(page, 'post-response-script-editor', script);
};

// The Electron app is shared by the tests of this file, so none of them may rely on variables or
// responses left behind by another. `pingSendToken` is rewritten by every real send of `ping`
// (its pre-request script), which makes "was the request sent again" observable from a script.
for (const mode of ['safe', 'developer'] as const) {
  test.describe(`Run post-response script on the last response [${mode} mode]`, () => {
    test.beforeEach(async ({ pageWithUserData: page }) => {
      test.setTimeout(90 * 1000);
      await setSandboxMode(page, COLLECTION, mode);
    });

    test('is disabled for a request that has no response yet', async ({ pageWithUserData: page }) => {
      const rerun = buildCommonLocators(page).paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'never-sent');
      await selectScriptSubTab(page, 'post-response');

      await expect(rerun).toBeVisible();
      await expect(rerun).toBeDisabled();
    });

    test('reruns an edited script on the stored response without resending or re-running the pre-request script', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const rerun = locators.paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'ping');
      await sendRequest(page, 200);
      await selectScriptSubTab(page, 'post-response');
      await expect(rerun).toBeEnabled();

      await test.step('An edited script runs against the stored response', async () => {
        await setPostResponseScript(page, `
          bru.setVar('tokenSeenByFirstRerun', bru.getVar('pingSendToken'));
          test('rerun sees the body', function () { expect(res.getBody()).to.equal('pong'); });
        `);
        await rerun.click();
        await selectResponsePaneTab(page, 'Tests');
        await expect(locators.response.assertionResults.passed()).toContainText(['rerun sees the body']);
      });

      await test.step('The request was not sent again and the pre-request script did not run', async () => {
        await setPostResponseScript(page, `
          test('send token is unchanged', function () {
            expect(bru.getVar('pingSendToken')).to.equal(bru.getVar('tokenSeenByFirstRerun'));
          });
        `);
        await rerun.click();
        await expect(locators.response.assertionResults.passed()).toContainText(['send token is unchanged']);
      });

      await test.step('A script that rewrites the body does not change the stored response on the next run', async () => {
        await setPostResponseScript(page, `
          res.setBody('rewritten');
          test('body rewritten inside the run', function () { expect(res.getBody()).to.equal('rewritten'); });
        `);
        await rerun.click();
        await expect(locators.response.assertionResults.passed()).toContainText(['body rewritten inside the run']);

        await setPostResponseScript(page, `
          test('stored body is intact', function () { expect(res.getBody()).to.equal('pong'); });
        `);
        await rerun.click();
        await expect(locators.response.assertionResults.passed()).toContainText(['stored body is intact']);
      });
    });

    test('script errors are reported through the response error card and the next run recovers', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const errors = buildResponseErrorsLocators(page);
      const rerun = locators.paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'ping');
      await sendRequest(page, 200);
      // The error card is only shown while the Response tab is active
      await selectResponsePaneTab(page, 'Response');

      await test.step('A throwing script shows the post-response error and leaves the response intact', async () => {
        await setPostResponseScript(page, 'throw new Error("rerun boom");');
        await rerun.click();

        await expect(errors.title(errors.card())).toContainText('Post-Response Script Error');
        await expect(errors.message(errors.card())).toContainText('rerun boom');
        await expect(locators.response.statusCode()).toContainText('200');
        await expect(rerun).toBeEnabled();
      });

      await test.step('A following successful run clears the error', async () => {
        await setPostResponseScript(page, 'test("recovered", function () { expect(true).to.equal(true); });');
        await rerun.click();

        await expect(errors.card()).toBeHidden();
        await selectResponsePaneTab(page, 'Tests');
        await expect(locators.response.assertionResults.passed()).toContainText(['recovered']);
      });
    });

    test('async scripts finish before the action becomes available again', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const rerun = locators.paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'ping');
      await sendRequest(page, 200);

      await setPostResponseScript(page, `
        await new Promise((resolve) => setTimeout(resolve, 300));
        test('async work completed', function () { expect(res.getBody()).to.equal('pong'); });
      `);
      await rerun.click();

      await selectResponsePaneTab(page, 'Tests');
      await expect(locators.response.assertionResults.passed()).toContainText(['async work completed']);
      await expect(rerun).toBeEnabled();
    });

    test('a request whose script rewrites the body is re-run on the response that was received', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const rerun = locators.paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'rewrites-body');
      await sendRequest(page, 200);

      await setPostResponseScript(page, `
        test('rerun sees the received body', function () { expect(res.getBody()).to.equal('pong'); });
      `);
      await rerun.click();

      await selectResponsePaneTab(page, 'Tests');
      await expect(locators.response.assertionResults.passed()).toContainText(['rerun sees the received body']);
    });

    test('a request whose script edits the response bytes in place is re-run on the bytes that were received', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const rerun = locators.paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'edits-buffer');
      await sendRequest(page, 200);

      await setPostResponseScript(page, `
        test('rerun sees the received bytes', function () { expect(res.getBody()).to.equal('pong'); });
      `);
      await rerun.click();

      await selectResponsePaneTab(page, 'Tests');
      await expect(locators.response.assertionResults.passed()).toContainText(['rerun sees the received bytes']);
    });

    test('an empty script disables the action', async ({ pageWithUserData: page }) => {
      const rerun = buildCommonLocators(page).paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'ping');
      await sendRequest(page, 200);
      await selectScriptSubTab(page, 'post-response');
      await expect(rerun).toBeEnabled();

      await setPostResponseScript(page, '   ');
      await expect(rerun).toBeDisabled();
    });

    test('each request runs against its own response when switching between requests', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const rerun = locators.paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'ping');
      await sendRequest(page, 200);

      await test.step('A request without a response of its own cannot reuse the other one', async () => {
        await openRequest(page, COLLECTION, 'never-sent');
        await selectScriptSubTab(page, 'post-response');
        await expect(rerun).toBeDisabled();
      });

      await test.step('After sending, the script sees that request\'s response', async () => {
        await openRequest(page, COLLECTION, 'query-echo');
        await sendRequest(page, 200);
        await setPostResponseScript(page, `
          test('body belongs to query-echo', function () { expect(res.getBody().owner).to.equal('query-echo'); });
        `);
        await rerun.click();
        await selectResponsePaneTab(page, 'Tests');
        await expect(locators.response.assertionResults.passed()).toContainText(['body belongs to query-echo']);
      });

      await test.step('Going back, the first request still holds its own response', async () => {
        await openRequest(page, COLLECTION, 'ping');
        await setPostResponseScript(page, `
          test('body belongs to ping', function () { expect(res.getBody()).to.equal('pong'); });
        `);
        await rerun.click();
        await expect(locators.response.assertionResults.passed()).toContainText(['body belongs to ping']);
      });
    });

    test('sending the request again after a re-run still runs the full pipeline', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const rerun = locators.paneTabs.rerunPostResponseScript();

      await openRequest(page, COLLECTION, 'ping');
      await sendRequest(page, 200);
      await setPostResponseScript(page, 'bru.setVar("tokenBeforeSecondSend", bru.getVar("pingSendToken"));');
      await rerun.click();

      await setPostResponseScript(page, `
        test('send token changed', function () {
          expect(bru.getVar('pingSendToken')).to.not.equal(bru.getVar('tokenBeforeSecondSend'));
        });
      `);

      await test.step('A re-run keeps the token, so the comparison fails', async () => {
        await rerun.click();
        await selectResponsePaneTab(page, 'Tests');
        await expect(locators.response.assertionResults.failed()).toContainText(['send token changed']);
      });

      await test.step('A real send runs the pre-request script again, so it passes', async () => {
        // Sending is refused while a re-run is still finishing
        await expect(rerun).toBeEnabled();
        await sendRequest(page, 200);
        await expect(locators.response.assertionResults.passed()).toContainText(['send token changed']);
      });
    });
  });
}
