import { test, expect, Page } from '../../playwright';
import { buildScriptErrorLocators, buildCommonLocators } from '../utils/page/locators';
import { openRequest, closeAllTabs, sendAndWaitForErrorCard, sendAndWaitForResponse } from '../utils/page/actions';
import { setSandboxMode, runCollection } from '../utils/page/runner';

/**
 * Helper: expand a folder in the sidebar and open a nested request.
 * Clicking the collection row is idempotent (only expands, never collapses).
 * Clicking the folder row is idempotent (only expands, never collapses).
 */
const openFolderRequest = async (page: Page, collectionName: string, folderName: string, requestName: string) => {
  await test.step(`Open folder request "${requestName}" in "${folderName}"`, async () => {
    const { sidebar, tabs } = buildCommonLocators(page);
    await sidebar.collectionRow(collectionName).click();
    const folder = sidebar.folder(folderName);
    await folder.waitFor({ state: 'visible' });
    await folder.click();
    const request = sidebar.request(requestName);
    await request.waitFor({ state: 'visible' });
    await request.click();
    await expect(tabs.activeRequestTab()).toContainText(requestName);
  });
};

for (const mode of ['safe', 'developer'] as const) {
  test.describe.serial(`Script Error Display [${mode} mode]`, () => {
    let scriptErrorLocators: ReturnType<typeof buildScriptErrorLocators>;
    let commonLocators: ReturnType<typeof buildCommonLocators>;

    test.beforeAll(async ({ pageWithUserData: page }) => {
      scriptErrorLocators = buildScriptErrorLocators(page);
      commonLocators = buildCommonLocators(page);

      await setSandboxMode(page, 'script-errors-test', mode);
      await setSandboxMode(page, 'collection-script-error', mode);
    });

    test('1. Pre-request ReferenceError shows error card with correct details', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify error card content', async () => {
        const card = scriptErrorLocators.card();
        await expect(scriptErrorLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(scriptErrorLocators.sourceLabel(card)).toContainText('Request');
        await expect(scriptErrorLocators.filePath(card)).toContainText('pre-request-ref-error.bru');
        await expect(scriptErrorLocators.message(card)).toContainText('ReferenceError');
        await expect(scriptErrorLocators.message(card)).toContainText('undefinedVariable');
        await expect(scriptErrorLocators.codeSnippet(card)).toBeVisible();
        await expect(scriptErrorLocators.errorLine(card)).toBeVisible();
        await expect(scriptErrorLocators.errorLine(card)).toContainText('undefinedVariable');
      });

      await test.step('Verify response status shows Error', async () => {
        await expect(commonLocators.response.statusCode()).toContainText('Error');
      });
    });

    test('2. Post-response TypeError shows error card with HTTP 200', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'post-response-type-error');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify error card content', async () => {
        const card = scriptErrorLocators.card();
        await expect(card).toBeVisible();
        await expect(scriptErrorLocators.title(card)).toContainText('Post-Response Script Error');
        await expect(scriptErrorLocators.sourceLabel(card)).toContainText('Request');
        await expect(scriptErrorLocators.filePath(card)).toContainText('post-response-type-error.bru');
        await expect(scriptErrorLocators.message(card)).toContainText('TypeError');
        await expect(scriptErrorLocators.errorLine(card)).toContainText('result.nonExistentMethod()');
      });

      await test.step('Verify HTTP 200 status', async () => {
        await expect(commonLocators.response.statusCode()).toContainText('200');
      });
    });

    test('3. Test script ReferenceError shows error card', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'test-script-error');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify error card content', async () => {
        const card = scriptErrorLocators.card();
        await expect(card).toBeVisible();
        await expect(scriptErrorLocators.title(card)).toContainText('Test Script Error');
        await expect(scriptErrorLocators.sourceLabel(card)).toContainText('Request');
        await expect(scriptErrorLocators.filePath(card)).toContainText('test-script-error.bru');
        await expect(scriptErrorLocators.message(card)).toContainText('ReferenceError');
        await expect(scriptErrorLocators.message(card)).toContainText('nonExistentFunction');
        await expect(scriptErrorLocators.errorLine(card)).toContainText('nonExistentFunction()');
      });
    });

    test('4. Stack trace toggle shows and hides stack trace', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify stack toggle is visible and stack is hidden', async () => {
        const card = scriptErrorLocators.card();
        await expect(scriptErrorLocators.stackToggle(card)).toBeVisible();
        await expect(scriptErrorLocators.stackToggle(card)).toContainText('Show stack trace');
        await expect(scriptErrorLocators.stack(card)).not.toBeVisible();
      });

      await test.step('Click toggle to show stack trace', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.stackToggle(card).click();
        await expect(scriptErrorLocators.stack(card)).toBeVisible();
        await expect(scriptErrorLocators.stackToggle(card)).toContainText('Hide stack trace');
      });

      await test.step('Click toggle to hide stack trace again', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.stackToggle(card).click();
        await expect(scriptErrorLocators.stack(card)).not.toBeVisible();
      });
    });

    test('5. Close button hides card and ScriptErrorIcon restores it', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Close error card', async () => {
        const card = scriptErrorLocators.card();
        await expect(card).toBeVisible();
        await scriptErrorLocators.closeButton(card).click();
        await expect(scriptErrorLocators.cards()).toHaveCount(0);
      });

      await test.step('Click error icon to restore card', async () => {
        await expect(scriptErrorLocators.errorIcon()).toBeVisible();
        await scriptErrorLocators.errorIcon().click();
        await expect(scriptErrorLocators.card()).toBeVisible();
      });
    });

    test('6. Multiple error cards for post-response and test failures', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'multiple-errors');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify two error cards are displayed', async () => {
        await expect(scriptErrorLocators.cards()).toHaveCount(2);
      });

      await test.step('Verify first card is post-response error', async () => {
        const card0 = scriptErrorLocators.card(0);
        await expect(scriptErrorLocators.title(card0)).toContainText('Post-Response Script Error');
        await expect(scriptErrorLocators.message(card0)).toContainText('postResponseMissingVar');
        await expect(scriptErrorLocators.errorLine(card0)).toContainText('postResponseMissingVar()');
      });

      await test.step('Verify second card is test script error', async () => {
        const card1 = scriptErrorLocators.card(1);
        await expect(scriptErrorLocators.title(card1)).toContainText('Test Script Error');
        await expect(scriptErrorLocators.message(card1)).toContainText('testMissingVar');
        await expect(scriptErrorLocators.errorLine(card1)).toContainText('testMissingVar()');
      });

      await test.step('Verify HTTP 200 status', async () => {
        await expect(commonLocators.response.statusCode()).toContainText('200');
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
        const card = scriptErrorLocators.card();
        await expect(scriptErrorLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(scriptErrorLocators.sourceLabel(card)).toContainText('Folder');
        await expect(scriptErrorLocators.sourceLabel(card)).toContainText('error-subfolder');
        await expect(scriptErrorLocators.filePath(card)).toContainText('folder.bru');
        await expect(scriptErrorLocators.message(card)).toContainText('ReferenceError');
        await expect(scriptErrorLocators.message(card)).toContainText('folderUndefinedVar');
        await expect(scriptErrorLocators.errorLine(card)).toContainText('folderUndefinedVar');
      });
    });

    test('8. Folder file-path navigation opens folder settings', async ({ pageWithUserData: page }) => {
      await test.step('Open folder request and trigger error', async () => {
        // Folder was expanded by test 7 (serial), so openRequest can find the nested request
        await openRequest(page, 'script-errors-test', 'folder-request');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.filePath(card).click();
      });

      await test.step('Verify navigation to folder settings with Script tab', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('error-subfolder');
        const scriptTab = commonLocators.paneTabs.folderSettingsTab('script');
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
        const card = scriptErrorLocators.card();
        await expect(scriptErrorLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(scriptErrorLocators.sourceLabel(card)).toContainText('Collection');
        await expect(scriptErrorLocators.filePath(card)).toContainText('collection.bru');
        await expect(scriptErrorLocators.message(card)).toContainText('ReferenceError');
        await expect(scriptErrorLocators.message(card)).toContainText('collectionUndefinedVar');
        await expect(scriptErrorLocators.errorLine(card)).toContainText('collectionUndefinedVar');
      });
    });

    test('10. Collection file-path navigation opens collection settings', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger collection error', async () => {
        await openRequest(page, 'collection-script-error', 'simple-request');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.filePath(card).click();
      });

      await test.step('Verify navigation to collection settings with Script tab', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('Collection');
        const scriptTab = commonLocators.paneTabs.collectionSettingsTab('script');
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    test('11. Request file-path navigation opens Script tab for pre-request error', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger error', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.filePath(card).click();
      });

      await test.step('Verify Script pane tab is active', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('pre-request-ref-error');
        const scriptTab = commonLocators.paneTabs.responsiveTab('script');
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    test('12. Request file-path navigation opens Tests tab for test error', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger error', async () => {
        await openRequest(page, 'script-errors-test', 'test-script-error');
        await sendAndWaitForResponse(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = scriptErrorLocators.card();
        await expect(card).toBeVisible();
        await scriptErrorLocators.filePath(card).click();
      });

      await test.step('Verify Tests pane tab is active', async () => {
        const testsTab = commonLocators.paneTabs.responsiveTab('tests');
        await expect(testsTab).toHaveClass(/active/);
      });
    });

    test('13. Runner: clicking request error file path opens request tab', async ({ pageWithUserData: page }) => {
      test.setTimeout(2 * 60 * 1000);

      await test.step('Close all existing request tabs', async () => {
        await closeAllTabs(page);
      });

      await test.step('Run collection via runner', async () => {
        await runCollection(page, 'script-errors-test');
      });

      await test.step('Click on failed request result to open detail pane', async () => {
        const resultItem = commonLocators.runnerResults.itemPath('pre-request-ref-error');
        await resultItem.locator('.danger').filter({ hasText: '(request failed)' }).click();
      });

      await test.step('Verify script error card in runner detail pane', async () => {
        const card = scriptErrorLocators.card();
        await card.waitFor({ state: 'visible', timeout: 10000 });
        await expect(scriptErrorLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(scriptErrorLocators.filePath(card)).toContainText('pre-request-ref-error.bru');
      });

      await test.step('Click file path to navigate to request', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.filePath(card).click();
      });

      await test.step('Verify request tab opened with Script sub-tab active', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('pre-request-ref-error');
        const scriptTab = commonLocators.paneTabs.responsiveTab('script');
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    test('14. Post-response file-path navigation opens Script tab with Post Response sub-tab', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger post-response error', async () => {
        await openRequest(page, 'script-errors-test', 'post-response-type-error');
        await sendAndWaitForResponse(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = scriptErrorLocators.card();
        await expect(card).toBeVisible();
        await scriptErrorLocators.filePath(card).click();
      });

      await test.step('Verify Script pane tab is active', async () => {
        const scriptTab = commonLocators.paneTabs.responsiveTab('script');
        await expect(scriptTab).toHaveClass(/active/);
      });

      await test.step('Verify Post Response sub-tab is active', async () => {
        const postResponseSubTab = commonLocators.paneTabs.tabTrigger('post-response');
        await expect(postResponseSubTab).toHaveClass(/active/);
      });
    });

    test('15. Keyboard navigation (Enter key) triggers file-path navigation', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger error', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Focus file path and press Enter', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.filePath(card).focus();
        await page.keyboard.press('Enter');
      });

      await test.step('Verify Script pane tab is active (same as click navigation)', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('pre-request-ref-error');
        const scriptTab = commonLocators.paneTabs.responsiveTab('script');
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    // Skip: currently closing one error card closes all cards. Unskip once independent card close is implemented.
    test.skip('16. Multiple error cards — closing one preserves the other', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'multiple-errors');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify two error cards exist', async () => {
        await expect(scriptErrorLocators.cards()).toHaveCount(2);
      });

      await test.step('Close the first card (post-response error)', async () => {
        const card0 = scriptErrorLocators.card(0);
        await scriptErrorLocators.closeButton(card0).click();
      });

      await test.step('Verify only one card remains and it is the test script error', async () => {
        await expect(scriptErrorLocators.cards()).toHaveCount(1);
        const remainingCard = scriptErrorLocators.card(0);
        await expect(scriptErrorLocators.title(remainingCard)).toContainText('Test Script Error');
        await expect(scriptErrorLocators.message(remainingCard)).toContainText('testMissingVar');
      });

      await test.step('Verify ScriptErrorIcon appears for the closed card', async () => {
        await expect(scriptErrorLocators.errorIcon()).toBeVisible();
      });
    });

    test('17. Runner: test error file-path navigation opens Tests tab', async ({ pageWithUserData: page }) => {
      test.setTimeout(2 * 60 * 1000);

      await test.step('Close all existing request tabs', async () => {
        await closeAllTabs(page);
      });

      await test.step('Run collection via runner', async () => {
        await runCollection(page, 'script-errors-test');
      });

      await test.step('Click on test-script-error result to open detail pane', async () => {
        const resultItem = commonLocators.runnerResults.itemPath('test-script-error');
        await resultItem.locator('.link').click();
      });

      await test.step('Verify script error card in runner detail pane', async () => {
        const card = scriptErrorLocators.card();
        await card.waitFor({ state: 'visible', timeout: 10000 });
        await expect(scriptErrorLocators.title(card)).toContainText('Test Script Error');
        await expect(scriptErrorLocators.filePath(card)).toContainText('test-script-error.bru');
      });

      await test.step('Click file path to navigate to request', async () => {
        const card = scriptErrorLocators.card();
        await scriptErrorLocators.filePath(card).click();
      });

      await test.step('Verify request tab opened with Tests sub-tab active', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('test-script-error');
        const testsTab = commonLocators.paneTabs.responsiveTab('tests');
        await expect(testsTab).toHaveClass(/active/);
      });
    });
  });
}
