import { test, expect, Page } from '../../playwright';
import { buildScriptErrorLocators, buildCommonLocators } from '../utils/page/locators';
import { openRequest } from '../utils/page/actions';
import { setSandboxMode } from '../utils/page/runner';

/**
 * Helper: click send and wait for at least one error card to appear.
 */
const sendAndWaitForErrorCard = async (page: Page) => {
  await page.getByTestId('send-arrow-icon').click();
  await page.getByTestId('script-error-card').first().waitFor({ state: 'visible', timeout: 15000 });
};

/**
 * Helper: click send and wait for a response status code to appear.
 * Used for requests that succeed at HTTP level but may have post-response/test errors.
 */
const sendAndWaitForResponse = async (page: Page) => {
  await page.getByTestId('send-arrow-icon').click();
  await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: 15000 });
};

/**
 * Helper: expand a folder in the sidebar and open a nested request.
 * Clicking the collection row is idempotent (only expands, never collapses).
 * Clicking the folder row is idempotent (only expands, never collapses).
 */
const openFolderRequest = async (page: Page, collectionName: string, folderName: string, requestName: string) => {
  await test.step(`Open folder request "${requestName}" in "${folderName}"`, async () => {
    const locators = buildCommonLocators(page);
    const collectionRow = page.getByTestId('sidebar-collection-row').filter({ hasText: collectionName });
    await collectionRow.click();
    const folder = page.locator('.collection-item-name').filter({ hasText: folderName });
    await folder.waitFor({ state: 'visible' });
    await folder.click();
    const request = page.locator('.collection-item-name').filter({ hasText: requestName });
    await request.waitFor({ state: 'visible' });
    await request.click();
    await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
  });
};

for (const mode of ['safe', 'developer'] as const) {
  test.describe.serial(`Script Error Display [${mode} mode]`, () => {
    let se: ReturnType<typeof buildScriptErrorLocators>;
    let locators: ReturnType<typeof buildCommonLocators>;

    test.beforeAll(async ({ pageWithUserData: page }) => {
      se = buildScriptErrorLocators(page);
      locators = buildCommonLocators(page);

      await setSandboxMode(page, 'script-errors-test', mode);
      await setSandboxMode(page, 'collection-script-error', mode);
    });

    test('1. Pre-request ReferenceError shows error card with correct details', async ({ pageWithUserData: page }) => {
      se = buildScriptErrorLocators(page);
      locators = buildCommonLocators(page);

      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify error card content', async () => {
        const card = se.card();
        await expect(se.title(card)).toContainText('Pre-Request Script Error');
        await expect(se.sourceLabel(card)).toContainText('Request Script');
        await expect(se.filePath(card)).toContainText('pre-request-ref-error.bru');
        await expect(se.message(card)).toContainText('ReferenceError');
        await expect(se.message(card)).toContainText('undefinedVariable');
        await expect(se.codeSnippet(card)).toBeVisible();
        await expect(se.errorLine(card)).toBeVisible();
      });

      await test.step('Verify response status shows Error', async () => {
        await expect(page.getByTestId('response-status-code')).toContainText('Error');
      });
    });

    test('2. Post-response TypeError shows error card with HTTP 200', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'post-response-type-error');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify error card content', async () => {
        const card = se.card();
        await expect(card).toBeVisible();
        await expect(se.title(card)).toContainText('Post-Response Script Error');
        await expect(se.sourceLabel(card)).toContainText('Request Script');
        await expect(se.filePath(card)).toContainText('post-response-type-error.bru');
        await expect(se.message(card)).toContainText('TypeError');
      });

      await test.step('Verify HTTP 200 status', async () => {
        await expect(page.getByTestId('response-status-code')).toContainText('200');
      });
    });

    test('3. Test script ReferenceError shows error card', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'test-script-error');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify error card content', async () => {
        const card = se.card();
        await expect(card).toBeVisible();
        await expect(se.title(card)).toContainText('Test Script Error');
        await expect(se.sourceLabel(card)).toContainText('Request Script');
        await expect(se.filePath(card)).toContainText('test-script-error.bru');
        await expect(se.message(card)).toContainText('ReferenceError');
        await expect(se.message(card)).toContainText('nonExistentFunction');
      });
    });

    test('4. Stack trace toggle shows and hides stack trace', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify stack toggle is visible and stack is hidden', async () => {
        const card = se.card();
        await expect(se.stackToggle(card)).toBeVisible();
        await expect(se.stackToggle(card)).toContainText('Show stack trace');
        await expect(se.stack(card)).not.toBeVisible();
      });

      await test.step('Click toggle to show stack trace', async () => {
        const card = se.card();
        await se.stackToggle(card).click();
        await expect(se.stack(card)).toBeVisible();
        await expect(se.stackToggle(card)).toContainText('Hide stack trace');
      });

      await test.step('Click toggle to hide stack trace again', async () => {
        const card = se.card();
        await se.stackToggle(card).click();
        await expect(se.stack(card)).not.toBeVisible();
      });
    });

    test('5. Close button hides card and ScriptErrorIcon restores it', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Close error card', async () => {
        const card = se.card();
        await expect(card).toBeVisible();
        await se.closeButton(card).click();
        await expect(se.cards()).toHaveCount(0);
      });

      await test.step('Click error icon to restore card', async () => {
        await expect(se.errorIcon()).toBeVisible();
        await se.errorIcon().click();
        await expect(se.card()).toBeVisible();
      });
    });

    test('6. Multiple error cards for post-response and test failures', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'multiple-errors');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify two error cards are displayed', async () => {
        await expect(se.cards()).toHaveCount(2);
      });

      await test.step('Verify first card is post-response error', async () => {
        const card0 = se.card(0);
        await expect(se.title(card0)).toContainText('Post-Response Script Error');
        await expect(se.message(card0)).toContainText('postResponseMissingVar');
      });

      await test.step('Verify second card is test script error', async () => {
        const card1 = se.card(1);
        await expect(se.title(card1)).toContainText('Test Script Error');
        await expect(se.message(card1)).toContainText('testMissingVar');
      });

      await test.step('Verify HTTP 200 status', async () => {
        await expect(page.getByTestId('response-status-code')).toContainText('200');
      });
    });

    test('7. Folder-level script error shows folder source label', async ({ pageWithUserData: page }) => {
      await test.step('Open folder request', async () => {
        await openFolderRequest(page, 'script-errors-test', 'error-subfolder', 'folder-request');
      });

      await test.step('Send request and wait for error', async () => {
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify folder-level error card', async () => {
        const card = se.card();
        await expect(se.title(card)).toContainText('Pre-Request Script Error');
        await expect(se.sourceLabel(card)).toContainText('Folder');
        await expect(se.sourceLabel(card)).toContainText('error-subfolder');
        await expect(se.filePath(card)).toContainText('folder.bru');
        await expect(se.message(card)).toContainText('ReferenceError');
        await expect(se.message(card)).toContainText('folderUndefinedVar');
      });
    });

    test('8. Folder file-path navigation opens folder settings', async ({ pageWithUserData: page }) => {
      await test.step('Open folder request and trigger error', async () => {
        // Folder was expanded by test 7 (serial), so openRequest can find the nested request
        await openRequest(page, 'script-errors-test', 'folder-request');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = se.card();
        await se.filePath(card).click();
      });

      await test.step('Verify navigation to folder settings with Script tab', async () => {
        const activeTab = page.locator('.request-tab.active');
        await expect(activeTab).toContainText('error-subfolder');
        const scriptTab = page.locator('.tabs [role="tab"]').getByText('Script', { exact: true });
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    test('9. Collection-level script error shows collection source label', async ({ pageWithUserData: page }) => {
      await test.step('Open request in collection-script-error', async () => {
        await openRequest(page, 'collection-script-error', 'simple-request');
      });

      await test.step('Send request and wait for error', async () => {
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify collection-level error card', async () => {
        const card = se.card();
        await expect(se.title(card)).toContainText('Pre-Request Script Error');
        await expect(se.sourceLabel(card)).toContainText('Collection Script');
        await expect(se.filePath(card)).toContainText('collection.bru');
        await expect(se.message(card)).toContainText('ReferenceError');
        await expect(se.message(card)).toContainText('collectionUndefinedVar');
      });
    });

    test('10. Collection file-path navigation opens collection settings', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger collection error', async () => {
        await openRequest(page, 'collection-script-error', 'simple-request');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = se.card();
        await se.filePath(card).click();
      });

      await test.step('Verify navigation to collection settings with Script tab', async () => {
        const activeTab = page.locator('.request-tab.active');
        await expect(activeTab).toContainText('Collection');
        const scriptTab = page.locator('.tabs [role="tab"]').getByText('Script', { exact: true });
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    test('11. Request file-path navigation opens Script tab for pre-request error', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger error', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = se.card();
        await se.filePath(card).click();
      });

      await test.step('Verify Script pane tab is active', async () => {
        const activeTab = page.locator('.request-tab.active');
        await expect(activeTab).toContainText('pre-request-ref-error');
        const scriptTab = page.locator('.tabs [role="tab"]').getByText('Script', { exact: true });
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    test('12. Request file-path navigation opens Tests tab for test error', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger error', async () => {
        await openRequest(page, 'script-errors-test', 'test-script-error');
        await sendAndWaitForResponse(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = se.card();
        await expect(card).toBeVisible();
        await se.filePath(card).click();
      });

      await test.step('Verify Tests pane tab is active', async () => {
        const testsTab = page.locator('.tabs [role="tab"]').getByText('Tests', { exact: true });
        await expect(testsTab).toHaveClass(/active/);
      });
    });
  });
}
