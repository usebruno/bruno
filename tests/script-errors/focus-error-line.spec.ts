import { test, expect, Page } from '../../playwright';
import { buildScriptErrorLocators, buildCommonLocators } from '../utils/page/locators';
import { openRequest, sendAndWaitForErrorCard, sendAndWaitForResponse, closeAllTabs } from '../utils/page/actions';
import { setSandboxMode } from '../utils/page/runner';

/**
 * Resolves the CodeMirror scroller `scrollTop` for an editor inside a given
 * test-id container. Returns null if the container/scroller is not present.
 */
const getScrollerScrollTop = async (page: Page, dataTestId: string): Promise<number | null> => {
  return page.evaluate((id) => {
    const root = document.querySelector(`[data-testid="${id}"]`);
    const scroller = root?.querySelector('.CodeMirror-scroll') as HTMLElement | null;
    return scroller ? scroller.scrollTop : null;
  }, dataTestId);
};

test.describe('Script Error — focus error line (highlight + scroll)', () => {
  let scriptErrorLocators: ReturnType<typeof buildScriptErrorLocators>;
  let commonLocators: ReturnType<typeof buildCommonLocators>;

  test.beforeAll(async ({ pageWithUserData: page }) => {
    scriptErrorLocators = buildScriptErrorLocators(page);
    commonLocators = buildCommonLocators(page);
    // Highlight/scroll is a pure UI concern — pick one sandbox mode.
    await setSandboxMode(page, 'script-errors-test', 'developer');
  });

  test.beforeEach(async ({ pageWithUserData: page }) => {
    await closeAllTabs(page);
  });

  test('Clicking file path adds the error-line highlight class', async ({ pageWithUserData: page }) => {
    await test.step('Open request and send', async () => {
      await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
      await sendAndWaitForErrorCard(page);
    });

    await test.step('Click file path to navigate', async () => {
      const card = scriptErrorLocators.card();
      await scriptErrorLocators.filePath(card).click();
    });

    await test.step('Pre-request editor shows flash class on the error line', async () => {
      const scriptTab = commonLocators.paneTabs.responsiveTab('script');
      await expect(scriptTab).toHaveClass(/active/);

      const flashedLine = page
        .getByTestId('pre-request-script-editor')
        .locator('.CodeMirror .cm-error-line-flash');
      await expect(flashedLine).toHaveCount(1);
    });
  });

  test('Highlight clears automatically after the flash duration', async ({ pageWithUserData: page }) => {
    await test.step('Open request, send, then navigate', async () => {
      await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
      await sendAndWaitForErrorCard(page);
      await scriptErrorLocators.filePath(scriptErrorLocators.card()).click();
    });

    await test.step('Flash class is present immediately', async () => {
      const flashedLine = page
        .getByTestId('pre-request-script-editor')
        .locator('.CodeMirror .cm-error-line-flash');
      await expect(flashedLine).toHaveCount(1);
    });

    await test.step('Flash class is gone after ~3s', async () => {
      const flashedLine = page
        .getByTestId('pre-request-script-editor')
        .locator('.CodeMirror .cm-error-line-flash');
      // Helper's default duration is 3000ms. Allow 4s for animation end + cleanup.
      await expect(flashedLine).toHaveCount(0, { timeout: 5000 });
    });
  });

  test('Re-clicking the file path re-triggers the highlight', async ({ pageWithUserData: page }) => {
    await test.step('Open request and send', async () => {
      await openRequest(page, 'script-errors-test', 'pre-request-ref-error');
      await sendAndWaitForErrorCard(page);
    });

    const flashedLine = page
      .getByTestId('pre-request-script-editor')
      .locator('.CodeMirror .cm-error-line-flash');

    await test.step('First click flashes the line, then it fades', async () => {
      await scriptErrorLocators.filePath(scriptErrorLocators.card()).click();
      await expect(flashedLine).toHaveCount(1);
      await expect(flashedLine).toHaveCount(0, { timeout: 5000 });
    });

    await test.step('Second click flashes the line again', async () => {
      await scriptErrorLocators.filePath(scriptErrorLocators.card()).click();
      await expect(flashedLine).toHaveCount(1);
    });
  });

  test('Post-response error navigates to post-response sub-tab and flashes', async ({ pageWithUserData: page }) => {
    await test.step('Open request and send', async () => {
      await openRequest(page, 'script-errors-test', 'post-response-type-error');
      await sendAndWaitForResponse(page);
    });

    await test.step('Click file path to navigate', async () => {
      const card = scriptErrorLocators.card();
      await expect(card).toBeVisible();
      await scriptErrorLocators.filePath(card).click();
    });

    await test.step('Post Response sub-tab is active', async () => {
      const postResponseSubTab = commonLocators.paneTabs.tabTrigger('post-response');
      await expect(postResponseSubTab).toHaveClass(/active/);
    });

    await test.step('Post-response editor shows flash class on the error line', async () => {
      const flashedLine = page
        .getByTestId('post-response-script-editor')
        .locator('.CodeMirror .cm-error-line-flash');
      await expect(flashedLine).toHaveCount(1);
    });
  });

  test('Tests editor flashes the error line for test-script errors', async ({ pageWithUserData: page }) => {
    await test.step('Open request and send', async () => {
      await openRequest(page, 'script-errors-test', 'test-script-error');
      await sendAndWaitForResponse(page);
    });

    await test.step('Click file path to navigate', async () => {
      const card = scriptErrorLocators.card();
      await expect(card).toBeVisible();
      await scriptErrorLocators.filePath(card).click();
    });

    await test.step('Tests editor shows flash class on the error line', async () => {
      const flashedLine = page
        .getByTestId('test-script-editor')
        .locator('.CodeMirror .cm-error-line-flash');
      await expect(flashedLine).toHaveCount(1);
    });
  });

  test('Long-script error scrolls the editor so the line is visible', async ({ pageWithUserData: page }) => {
    await test.step('Open long-script request and send', async () => {
      await openRequest(page, 'script-errors-test', 'long-pre-request-error');
      await sendAndWaitForErrorCard(page);
    });

    await test.step('Click file path to navigate', async () => {
      const card = scriptErrorLocators.card();
      await scriptErrorLocators.filePath(card).click();
    });

    await test.step('Editor scrolled — scrollTop is non-zero', async () => {
      // Wait for the highlight to land, then sample the scroller's scrollTop.
      const flashedLine = page
        .getByTestId('pre-request-script-editor')
        .locator('.CodeMirror .cm-error-line-flash');
      await expect(flashedLine).toHaveCount(1);

      const scrollTop = await getScrollerScrollTop(page, 'pre-request-script-editor');
      expect(scrollTop).not.toBeNull();
      expect(scrollTop!).toBeGreaterThan(0);
    });

    await test.step('The flashed line is the one carrying the error', async () => {
      const flashedRow = page
        .getByTestId('pre-request-script-editor')
        .locator('.CodeMirror-code > div', { has: page.locator('.cm-error-line-flash') });
      await expect(flashedRow).toContainText('longScriptUndefinedVar');
    });
  });
});
