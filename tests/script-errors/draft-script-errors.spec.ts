import { test, expect } from '../../playwright';
import { buildScriptErrorLocators, buildCommonLocators } from '../utils/page/locators';
import {
  openRequest,
  selectRequestPaneTab,
  selectScriptSubTab,
  editCodeMirrorEditor,
  sendAndWaitForErrorCard,
  sendAndWaitForResponse
} from '../utils/page/actions';
import { setSandboxMode } from '../utils/page/runner';

for (const mode of ['safe', 'developer'] as const) {
  test.describe.serial(`Draft Script Error Context [${mode} mode]`, () => {
    let scriptErrorLocators: ReturnType<typeof buildScriptErrorLocators>;
    let commonLocators: ReturnType<typeof buildCommonLocators>;

    test.beforeAll(async ({ pageWithUserData: page }) => {
      scriptErrorLocators = buildScriptErrorLocators(page);
      commonLocators = buildCommonLocators(page);

      await setSandboxMode(page, 'script-errors-test', mode);
    });

    test('1. Draft pre-request error shows draft code in error context', async ({ pageWithUserData: page }) => {
      await test.step('Open draft-error-test request', async () => {
        await openRequest(page, 'script-errors-test', 'draft-error-test');
      });

      await test.step('Navigate to Script > Pre Request tab and edit script', async () => {
        await selectScriptSubTab(page, 'pre-request');

        await editCodeMirrorEditor(
          page,
          'pre-request-script-editor',
          'const draftOnlyVar = "draft";\ndraftOnlyUndefined();'
        );
      });

      await test.step('Verify draft indicator is visible', async () => {
        await expect(commonLocators.tabs.draftIndicator()).toBeVisible({ timeout: 5000 });
      });

      await test.step('Send request and wait for error card', async () => {
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify error card shows draft code, not saved code', async () => {
        const card = scriptErrorLocators.card();
        await expect(scriptErrorLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(scriptErrorLocators.errorLine(card)).toContainText('draftOnlyUndefined');
        await expect(scriptErrorLocators.errorLine(card)).not.toContainText('savedVar');
      });
    });

    test('2. Draft post-response error shows draft code in error context', async ({ pageWithUserData: page }) => {
      await test.step('Open draft-postres-test request', async () => {
        await openRequest(page, 'script-errors-test', 'draft-postres-test');
      });

      await test.step('Navigate to Script > Post Response tab and edit script', async () => {
        await selectScriptSubTab(page, 'post-response');

        await editCodeMirrorEditor(
          page,
          'post-response-script-editor',
          'const postDraftVar = "post-draft";\npostDraftUndefined();'
        );
      });

      await test.step('Verify draft indicator is visible', async () => {
        await expect(commonLocators.tabs.draftIndicator()).toBeVisible({ timeout: 5000 });
      });

      await test.step('Send request and wait for error card', async () => {
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify error card shows draft code, not saved code', async () => {
        const card = scriptErrorLocators.card();
        await expect(card).toBeVisible();
        await expect(scriptErrorLocators.title(card)).toContainText('Post-Response Script Error');
        await expect(scriptErrorLocators.errorLine(card)).toContainText('postDraftUndefined');
        await expect(scriptErrorLocators.errorLine(card)).not.toContainText('savedData');
      });
    });

    test('3. Draft test script error shows draft code in error context', async ({ pageWithUserData: page }) => {
      await test.step('Open draft-tests-test request', async () => {
        await openRequest(page, 'script-errors-test', 'draft-tests-test');
      });

      await test.step('Navigate to Tests tab and edit script', async () => {
        await selectRequestPaneTab(page, 'Tests');

        await editCodeMirrorEditor(
          page,
          'test-script-editor',
          'const draftTest = "test";\ndraftTestUndefined();'
        );
      });

      await test.step('Verify draft indicator is visible', async () => {
        await expect(commonLocators.tabs.draftIndicator()).toBeVisible({ timeout: 5000 });
      });

      await test.step('Send request and wait for response', async () => {
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify error card shows draft code, not saved code', async () => {
        const card = scriptErrorLocators.card();
        await expect(card).toBeVisible();
        await expect(scriptErrorLocators.title(card)).toContainText('Test Script Error');
        await expect(scriptErrorLocators.errorLine(card)).toContainText('draftTestUndefined');
        await expect(scriptErrorLocators.errorLine(card)).not.toContainText('savedTest');
      });
    });
  });
}
