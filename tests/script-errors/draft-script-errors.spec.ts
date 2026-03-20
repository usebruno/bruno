import { test, expect, Page } from '../../playwright';
import { buildScriptErrorLocators, buildCommonLocators } from '../utils/page/locators';
import { openRequest, selectRequestPaneTab } from '../utils/page/actions';
import { setSandboxMode } from '../utils/page/runner';

const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

/**
 * Helper: click send and wait for at least one error card to appear.
 */
const sendAndWaitForErrorCard = async (page: Page) => {
  const { request } = buildCommonLocators(page);
  const scriptErrorLocators = buildScriptErrorLocators(page);
  await request.sendButton().click();
  await scriptErrorLocators.card().waitFor({ state: 'visible', timeout: 15000 });
};

/**
 * Helper: click send and wait for a response status code to appear.
 */
const sendAndWaitForResponse = async (page: Page) => {
  const { request, response } = buildCommonLocators(page);
  await request.sendButton().click();
  await response.statusCode().waitFor({ state: 'visible', timeout: 15000 });
};

/**
 * Helper: edit a CodeMirror script editor by clearing and typing new content.
 */
const editScriptEditor = async (page: Page, editorTestId: string, newContent: string) => {
  const editor = page.getByTestId(editorTestId).locator('.CodeMirror').first();
  await editor.waitFor({ state: 'visible' });
  const textarea = editor.locator('textarea[tabindex="0"]');
  await textarea.focus();
  await page.keyboard.press(selectAllShortcut);
  await page.keyboard.press('Backspace');
  await page.keyboard.type(newContent, { delay: 5 });
};

for (const mode of ['safe', 'developer'] as const) {
  test.describe.serial(`Draft Script Error Context [${mode} mode]`, () => {
    let scriptErrorLocators: ReturnType<typeof buildScriptErrorLocators>;

    test.beforeAll(async ({ pageWithUserData: page }) => {
      scriptErrorLocators = buildScriptErrorLocators(page);

      await setSandboxMode(page, 'script-errors-test', mode);
    });

    test('1. Draft pre-request error shows draft code in error context', async ({ pageWithUserData: page }) => {
      await test.step('Open draft-error-test request', async () => {
        await openRequest(page, 'script-errors-test', 'draft-error-test');
      });

      await test.step('Navigate to Script > Pre Request tab and edit script', async () => {
        const requestPane = page.locator('.request-pane > .px-4');
        await expect(requestPane).toBeVisible();
        await expect(requestPane.locator('.tabs')).toBeVisible();

        const scriptTab = page.locator('.tabs').getByRole('tab', { name: 'Script' });
        await scriptTab.click();
        await expect(scriptTab).toContainClass('active');

        await page.getByRole('button', { name: 'Pre Request' }).click();

        await editScriptEditor(
          page,
          'pre-request-script-editor',
          'const draftOnlyVar = "draft";\ndraftOnlyUndefined();'
        );
      });

      await test.step('Verify draft indicator is visible', async () => {
        const requestTab = page.locator('.request-tab.active');
        await expect(requestTab.locator('.has-changes-icon')).toBeVisible({ timeout: 5000 });
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
        const requestPane = page.locator('.request-pane > .px-4');
        await expect(requestPane).toBeVisible();
        await expect(requestPane.locator('.tabs')).toBeVisible();

        const scriptTab = page.locator('.tabs').getByRole('tab', { name: 'Script' });
        await scriptTab.click();
        await expect(scriptTab).toContainClass('active');

        await page.getByRole('button', { name: 'Post Response' }).click();

        await editScriptEditor(
          page,
          'post-response-script-editor',
          'const postDraftVar = "post-draft";\npostDraftUndefined();'
        );
      });

      await test.step('Verify draft indicator is visible', async () => {
        const requestTab = page.locator('.request-tab.active');
        await expect(requestTab.locator('.has-changes-icon')).toBeVisible({ timeout: 5000 });
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
        const requestPane = page.locator('.request-pane > .px-4');
        await expect(requestPane).toBeVisible();
        await expect(requestPane.locator('.tabs')).toBeVisible();

        await selectRequestPaneTab(page, 'Tests');

        await editScriptEditor(
          page,
          'test-script-editor',
          'const draftTest = "test";\ndraftTestUndefined();'
        );
      });

      await test.step('Verify draft indicator is visible', async () => {
        const requestTab = page.locator('.request-tab.active');
        await expect(requestTab.locator('.has-changes-icon')).toBeVisible({ timeout: 5000 });
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
