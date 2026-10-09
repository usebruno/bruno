import { test, expect, Page } from '../../playwright';
import { buildResponseErrorsLocators, buildCommonLocators } from '../utils/page/locators';
import { openRequest, closeAllTabs, sendAndWaitForErrorCard, sendAndWaitForResponse, openFolderRequest, getScrollMetrics, selectResponsePaneTab } from '../utils/page/actions';
import { setSandboxMode, runCollection } from '../utils/page/runner';

for (const mode of ['safe', 'developer'] as const) {
  test.describe(`Script Error Display [${mode} mode]`, () => {
    let responseErrorsLocators: ReturnType<typeof buildResponseErrorsLocators>;
    let commonLocators: ReturnType<typeof buildCommonLocators>;

    test.beforeAll(async ({ pageWithUserData: page }) => {
      responseErrorsLocators = buildResponseErrorsLocators(page);
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
        const card = responseErrorsLocators.card();
        await expect(responseErrorsLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(responseErrorsLocators.sourceLabel(card)).toContainText('Request');
        await expect(responseErrorsLocators.filePath(card)).toContainText('pre-request-ref-error.bru');
        await expect(responseErrorsLocators.message(card)).toContainText('ReferenceError');
        await expect(responseErrorsLocators.message(card)).toContainText('undefinedVariable');
        await expect(responseErrorsLocators.codeSnippet(card)).toBeVisible();
        await expect(responseErrorsLocators.errorLine(card)).toBeVisible();
        await expect(responseErrorsLocators.errorLine(card)).toContainText('undefinedVariable');
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
        const card = responseErrorsLocators.card();
        await expect(card).toBeVisible();
        await expect(responseErrorsLocators.title(card)).toContainText('Post-Response Script Error');
        await expect(responseErrorsLocators.sourceLabel(card)).toContainText('Request');
        await expect(responseErrorsLocators.filePath(card)).toContainText('post-response-type-error.bru');
        await expect(responseErrorsLocators.message(card)).toContainText('TypeError');
        await expect(responseErrorsLocators.errorLine(card)).toContainText('result.nonExistentMethod()');
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
        const card = responseErrorsLocators.card();
        await expect(card).toBeVisible();
        await expect(responseErrorsLocators.title(card)).toContainText('Test Script Error');
        await expect(responseErrorsLocators.sourceLabel(card)).toContainText('Request');
        await expect(responseErrorsLocators.filePath(card)).toContainText('test-script-error.bru');
        await expect(responseErrorsLocators.message(card)).toContainText('ReferenceError');
        await expect(responseErrorsLocators.message(card)).toContainText('nonExistentFunction');
        await expect(responseErrorsLocators.errorLine(card)).toContainText('nonExistentFunction()');
      });
    });

    test('4. Stack trace toggle shows and hides stack trace', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Verify stack trace toggle is visible and stack trace is hidden', async () => {
        const card = responseErrorsLocators.card();
        await expect(responseErrorsLocators.stackTraceToggle(card)).toBeVisible();
        await expect(responseErrorsLocators.stackTraceToggle(card)).toContainText('Show stack trace');
        await expect(responseErrorsLocators.stackTrace(card)).not.toBeVisible();
      });

      await test.step('Click toggle to show stack trace', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.stackTraceToggle(card).click();
        await expect(responseErrorsLocators.stackTrace(card)).toBeVisible();
        await expect(responseErrorsLocators.stackTraceToggle(card)).toContainText('Hide stack trace');
      });

      await test.step('Click toggle to hide stack trace again', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.stackTraceToggle(card).click();
        await expect(responseErrorsLocators.stackTrace(card)).not.toBeVisible();
      });
    });

    test('5. Close button hides card and the error icon with its count restores it', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Close error card', async () => {
        const card = responseErrorsLocators.card();
        await expect(card).toBeVisible();
        await responseErrorsLocators.closeButton(card).click();
        await expect(responseErrorsLocators.card()).toHaveCount(0);
      });

      await test.step('Click error icon to restore card', async () => {
        await expect(responseErrorsLocators.errorIcon()).toBeVisible();
        await expect(responseErrorsLocators.iconCount()).toHaveText('1');
        await responseErrorsLocators.errorIcon().click();
        await expect(responseErrorsLocators.card()).toBeVisible();
      });
    });

    test('6. Post-response and test failures share one card as collapsed rows', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'multiple-errors');
        await sendAndWaitForResponse(page);
      });

      await test.step('Verify one card with two collapsed rows', async () => {
        await expect(responseErrorsLocators.card()).toHaveCount(1);
        await expect(responseErrorsLocators.title()).toHaveText('2 errors');
        await expect(responseErrorsLocators.rows()).toHaveCount(2);
        await expect(responseErrorsLocators.message()).toHaveCount(0);
      });

      await test.step('Verify first row is the post-response error', async () => {
        const row = responseErrorsLocators.row(0);
        await expect(responseErrorsLocators.rowToggle(row)).toContainText('Post-Response');
        await expect(responseErrorsLocators.rowPreview(row)).toContainText('postResponseMissingVar');

        await responseErrorsLocators.rowToggle(row).click();
        await expect(responseErrorsLocators.message(row)).toContainText('postResponseMissingVar');
        await expect(responseErrorsLocators.errorLine(row)).toContainText('postResponseMissingVar()');
      });

      await test.step('Verify second row is the test script error', async () => {
        const row = responseErrorsLocators.row(1);
        await expect(responseErrorsLocators.rowToggle(row)).toContainText('Test');
        await expect(responseErrorsLocators.rowPreview(row)).toContainText('testMissingVar');

        await responseErrorsLocators.rowToggle(row).click();
        await expect(responseErrorsLocators.message(row)).toContainText('testMissingVar');
        await expect(responseErrorsLocators.errorLine(row)).toContainText('testMissingVar()');
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
        const card = responseErrorsLocators.card();
        await expect(responseErrorsLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(responseErrorsLocators.sourceLabel(card)).toContainText('Folder');
        await expect(responseErrorsLocators.sourceLabel(card)).toContainText('error-subfolder');
        await expect(responseErrorsLocators.filePath(card)).toContainText('folder.bru');
        await expect(responseErrorsLocators.message(card)).toContainText('ReferenceError');
        await expect(responseErrorsLocators.message(card)).toContainText('folderUndefinedVar');
        await expect(responseErrorsLocators.errorLine(card)).toContainText('folderUndefinedVar');
      });
    });

    test('8. Folder file-path navigation opens folder settings', async ({ pageWithUserData: page }) => {
      await test.step('Open folder request and trigger error', async () => {
        await openFolderRequest(page, 'script-errors-test', 'error-subfolder', 'folder-request');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.filePath(card).click();
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
        const card = responseErrorsLocators.card();
        await expect(responseErrorsLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(responseErrorsLocators.sourceLabel(card)).toContainText('Collection');
        await expect(responseErrorsLocators.filePath(card)).toContainText('collection.bru');
        await expect(responseErrorsLocators.message(card)).toContainText('ReferenceError');
        await expect(responseErrorsLocators.message(card)).toContainText('collectionUndefinedVar');
        await expect(responseErrorsLocators.errorLine(card)).toContainText('collectionUndefinedVar');
      });
    });

    test('10. Collection file-path navigation opens collection settings', async ({ pageWithUserData: page }) => {
      await test.step('Open request and trigger collection error', async () => {
        await openRequest(page, 'collection-script-error', 'simple-request');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Click file path to navigate', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.filePath(card).click();
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
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.filePath(card).click();
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
        const card = responseErrorsLocators.card();
        await expect(card).toBeVisible();
        await responseErrorsLocators.filePath(card).click();
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
        const card = responseErrorsLocators.card();
        await card.waitFor({ state: 'visible', timeout: 10000 });
        await expect(responseErrorsLocators.title(card)).toContainText('Pre-Request Script Error');
        await expect(responseErrorsLocators.filePath(card)).toContainText('pre-request-ref-error.bru');
      });

      await test.step('Click file path to navigate to request', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.filePath(card).click();
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
        const card = responseErrorsLocators.card();
        await expect(card).toBeVisible();
        await responseErrorsLocators.filePath(card).click();
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
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.filePath(card).focus();
        await page.keyboard.press('Enter');
      });

      await test.step('Verify Script pane tab is active (same as click navigation)', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('pre-request-ref-error');
        const scriptTab = commonLocators.paneTabs.responsiveTab('script');
        await expect(scriptTab).toHaveClass(/active/);
      });
    });

    test('16. Closing a card with several errors hides them all behind the icon, which restores every row', async ({ pageWithUserData: page }) => {
      await test.step('Open request and send', async () => {
        await openRequest(page, 'script-errors-test', 'multiple-errors');
        await sendAndWaitForResponse(page);
        await expect(responseErrorsLocators.rows()).toHaveCount(2);
      });

      await test.step('Close the card', async () => {
        await responseErrorsLocators.closeButton().click();
        await expect(responseErrorsLocators.card()).toHaveCount(0);
      });

      await test.step('The icon counts both errors', async () => {
        await expect(responseErrorsLocators.iconCount()).toHaveText('2');
      });

      await test.step('Clicking the icon brings back both rows', async () => {
        await responseErrorsLocators.errorIcon().click();
        await expect(responseErrorsLocators.rows()).toHaveCount(2);
        const postResponseRow = responseErrorsLocators.row(0);
        const testRow = responseErrorsLocators.row(1);
        await expect(responseErrorsLocators.rowPreview(postResponseRow)).toContainText('postResponseMissingVar');
        await expect(responseErrorsLocators.rowPreview(testRow)).toContainText('testMissingVar');
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
        const card = responseErrorsLocators.card();
        await card.waitFor({ state: 'visible', timeout: 10000 });
        await expect(responseErrorsLocators.title(card)).toContainText('Test Script Error');
        await expect(responseErrorsLocators.filePath(card)).toContainText('test-script-error.bru');
      });

      await test.step('Click file path to navigate to request', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.filePath(card).click();
      });

      await test.step('Verify request tab opened with Tests sub-tab active', async () => {
        const activeTab = commonLocators.tabs.activeRequestTab();
        await expect(activeTab).toContainText('test-script-error');
        const testsTab = commonLocators.paneTabs.responsiveTab('tests');
        await expect(testsTab).toHaveClass(/active/);
      });
    });

    test('18. Long error body scrolls when collapsed and fits the pane when expanded', async ({ pageWithUserData: page }) => {
      const scrollMetrics = () => getScrollMetrics(responseErrorsLocators.body(responseErrorsLocators.card()));

      await test.step('Open large-error request and send', async () => {
        await openRequest(page, 'script-errors-test', 'large-error-message');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Show stack trace so the body overflows its collapsed height', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.stackTraceToggle(card).click();
        await expect(responseErrorsLocators.stackTrace(card)).toBeVisible();
      });

      await test.step('Collapsed body is scrollable', async () => {
        const body = responseErrorsLocators.body(responseErrorsLocators.card());
        await expect.poll(async () => {
          const { scrollHeight, clientHeight } = await scrollMetrics();
          return scrollHeight - clientHeight;
        }).toBeGreaterThan(0);

        await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
        await expect.poll(async () => (await scrollMetrics()).scrollTop).toBeGreaterThan(0);
      });

      let collapsedHeight = 0;

      await test.step('Expand the card over the response tab, which stays mounted', async () => {
        const card = responseErrorsLocators.card();
        collapsedHeight = (await scrollMetrics()).clientHeight;

        await responseErrorsLocators.fullPaneToggle(card).click();
        await expect(responseErrorsLocators.fullPaneToggle(card)).toHaveAttribute('aria-pressed', 'true');

        await expect.poll(async () => (await scrollMetrics()).clientHeight).toBeGreaterThan(collapsedHeight);
        await expect(commonLocators.response.tabContent()).toBeAttached();
        await expect(commonLocators.response.tabContent()).toBeHidden();
      });

      await test.step('Expanded body scrolls all the way to the stack trace at the bottom', async () => {
        const card = responseErrorsLocators.card();
        const stackTrace = responseErrorsLocators.stackTrace(card);

        await expect(stackTrace).toBeVisible();

        // Scroll positions can be fractional, so allow a 1px rounding difference
        const roundingTolerance = 1;

        await expect.poll(async () => {
          const { scrollHeight, clientHeight, scrollTop } = await scrollMetrics();
          const visibleBottom = scrollTop + clientHeight;
          const hiddenContentBelow = scrollHeight - visibleBottom;
          return hiddenContentBelow;
        }).toBeLessThanOrEqual(roundingTolerance);
      });

      await test.step('Collapse restores the capped height and the response tab', async () => {
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.fullPaneToggle(card).click();
        await expect(responseErrorsLocators.fullPaneToggle(card)).toHaveAttribute('aria-pressed', 'false');

        await expect.poll(async () => (await scrollMetrics()).clientHeight).toBe(collapsedHeight);
        await expect(commonLocators.response.tabContent()).toBeVisible();
      });
    });

    test('19. Copy button copies file path, error message and stack trace', async ({ pageWithUserData: page, installFakeClipboard }) => {
      await test.step('Open request and trigger error', async () => {
        await openRequest(page, 'script-errors-test', 'large-error-message');
        await sendAndWaitForErrorCard(page);
      });

      await test.step('Copy the error details', async () => {
        const clipboard = await installFakeClipboard(page);
        const card = responseErrorsLocators.card();
        await responseErrorsLocators.copyButton(card).click();

        const largeMessage = 'X'.repeat(10 * 1024);
        await expect.poll(() => clipboard.copiedText()).toMatch(
          new RegExp(`^File: large-error-message\\.bru:2\\n\\nError: ${largeMessage}\\n\\nStack trace:\\n[\\s\\S]+$`)
        );
      });
    });

    test('20. A closed card stays closed after switching to another tab and back', async ({ pageWithUserData: page }) => {
      await test.step('Send a failing request and close its card', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
        await responseErrorsLocators.closeButton().click();
        await expect(responseErrorsLocators.card()).toHaveCount(0);
      });

      await test.step('Switch to another request and back', async () => {
        await openRequest(page, 'script-errors-test', 'post-response-type-error');
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
      });

      await test.step('The card is still closed and the icon still shows', async () => {
        await expect(responseErrorsLocators.errorIcon()).toBeVisible();
        await expect(responseErrorsLocators.card()).toHaveCount(0);
      });
    });

    test('21. Sending again after closing shows the card again', async ({ pageWithUserData: page }) => {
      await test.step('Send a failing request and close its card', async () => {
        await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
        await sendAndWaitForErrorCard(page);
        await responseErrorsLocators.closeButton().click();
        await expect(responseErrorsLocators.card()).toHaveCount(0);
      });

      await test.step('Send again', async () => {
        await sendAndWaitForErrorCard(page);
      });

      await test.step('The card is back and the icon is gone', async () => {
        await expect(responseErrorsLocators.card()).toBeVisible();
        await expect(responseErrorsLocators.errorIcon()).toHaveCount(0);
      });
    });

    test('22. An open row keeps its line pinned while its detail scrolls past', async ({ pageWithUserData: page }) => {
      const body = () => responseErrorsLocators.body(responseErrorsLocators.card());
      const firstRow = () => responseErrorsLocators.row(0);

      await test.step('Open both rows with their stack traces', async () => {
        await openRequest(page, 'script-errors-test', 'multiple-errors');
        await sendAndWaitForResponse(page);
        await responseErrorsLocators.toggleAll().click();
        for (const index of [0, 1]) {
          const row = responseErrorsLocators.row(index);
          await expect(responseErrorsLocators.rowToggle(row)).toHaveAttribute('aria-expanded', 'true');
          await responseErrorsLocators.stackTraceToggle(row).click();
          await expect(responseErrorsLocators.stackTrace(row)).toBeVisible();
        }
      });

      await test.step('The rows overflow the card', async () => {
        await expect.poll(async () => {
          const { scrollHeight, clientHeight } = await getScrollMetrics(body());
          return scrollHeight - clientHeight;
        }).toBeGreaterThan(0);
      });

      await test.step('Scrolling into the first row keeps its line at the top of the rows', async () => {
        await body().evaluate((el) => { el.scrollTop = 40; });
        await expect.poll(async () => (await getScrollMetrics(body())).scrollTop).toBeGreaterThan(0);

        // The row line carries a 1px top border above its toggle
        await expect.poll(async () => {
          const bodyTop = (await body().boundingBox())!.y;
          const rowToggleTop = (await responseErrorsLocators.rowToggle(firstRow()).boundingBox())!.y;
          return Math.round(rowToggleTop - bodyTop);
        }).toBe(1);
      });
    });

    test('23. Cancelling while the test script runs still shows the post-response error', async ({ pageWithUserData: page }) => {
      await test.step('Send a request whose post-response script throws and whose test script is slow', async () => {
        await openRequest(page, 'script-errors-test', 'cancel-during-tests');
        const testScriptStarted = page.waitForEvent('console', { predicate: (message) => message.text() === 'Test script started', timeout: 10000 });
        await commonLocators.request.sendButton().click();
        // The post-response error reaches the window before the test script runs, so its log means the error has landed
        await testScriptStarted;
      });

      await test.step('Cancel while the test script runs', async () => {
        await commonLocators.response.cancelRequestButton().click();
      });

      await test.step('The post-response error shows once the run settles', async () => {
        await expect(responseErrorsLocators.title()).toHaveText('Post-Response Script Error', { timeout: 15000 });
        await expect(responseErrorsLocators.message()).toContainText('Post-response script failed');
      });
    });

    test('24. Another response tab removes the card for the icon, which brings back the Response tab and the card', async ({ pageWithUserData: page }) => {
      await test.step('Send a request whose post-response script fails', async () => {
        await openRequest(page, 'script-errors-test', 'post-response-type-error');
        await sendAndWaitForErrorCard(page);
        await expect(responseErrorsLocators.errorIcon()).toHaveCount(0);
      });

      await test.step('The Timeline tab hides the card and shows the error icon', async () => {
        await selectResponsePaneTab(page, 'Timeline');
        await expect(responseErrorsLocators.card()).toHaveCount(0);
        await expect(responseErrorsLocators.iconCount()).toHaveText('1');
      });

      await test.step('Clicking the icon selects the Response tab and shows the card', async () => {
        await responseErrorsLocators.errorIcon().click();
        await expect(commonLocators.paneTabs.responsiveTab('response')).toHaveAttribute('aria-selected', 'true');
        await expect(responseErrorsLocators.card()).toBeVisible();
        await expect(responseErrorsLocators.errorIcon()).toHaveCount(0);
      });
    });

    test('25. Expanding and restoring the card keeps the response mounted', async ({ pageWithUserData: page }) => {
      const responsePreview = commonLocators.response.previewContainer();

      await test.step('Send a request that gets a response and a post-response error', async () => {
        await openRequest(page, 'script-errors-test', 'post-response-type-error');
        await sendAndWaitForErrorCard(page);
        await expect(responsePreview).toBeVisible();
        await responsePreview.evaluate((el) => el.setAttribute('data-mounted-before-expand', 'true'));
      });

      await test.step('Expand hides the response without unmounting it', async () => {
        await responseErrorsLocators.fullPaneToggle().click();
        await expect(responsePreview).toBeHidden();
        await expect(responsePreview).toHaveAttribute('data-mounted-before-expand', 'true');
      });

      await test.step('Restore shows the same response element', async () => {
        await responseErrorsLocators.fullPaneToggle().click();
        await expect(responsePreview).toBeVisible();
        await expect(responsePreview).toHaveAttribute('data-mounted-before-expand', 'true');
      });
    });
  });
}
