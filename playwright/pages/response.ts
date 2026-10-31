import { test, expect, Page, Locator } from '..';
import { selectPaneTab } from './components/pane-tabs';

/**
 * Locators for the response pane (status, body, format and preview, tests, actions).
 */
export const buildResponseLocators = (page: Page) => ({
  statusCode: () => page.getByTestId('response-status-code'),
  status: () => page.getByTestId('response-pane-status'),
  elapsedTime: () => page.getByTestId('response-elapsed-time'),
  time: () => page.getByTestId('response-pane-status').getByTestId('response-time'),
  // Rendered by every response pane (http, grpc, ws) only while a response exists, so its
  // absence doubles as the "response is cleared" signal.
  clearButton: () => page.getByTestId('response-clear-btn'),
  cancelRequestButton: () => page.getByRole('button', { name: 'Cancel Request' }),
  pane: () => page.locator('.response-pane'),
  errorMessage: () => page.getByTestId('response-pane').locator('.error'),
  copyButton: () => page.locator('button[title="Copy response to clipboard"]'),
  body: () => page.locator('.response-pane'),
  tabContent: () => page.getByTestId('response-tab-content'),
  editorContainer: () => page.locator('.response-pane .editor-container'),
  formatTab: () => page.getByTestId('format-response-tab'),
  formatTabDropdown: () => page.getByTestId('format-response-tab-dropdown'),
  previewContainer: () => page.getByTestId('response-preview-container'),
  previewContainerCodeMirror: () => page.getByTestId('response-preview-container').locator('.CodeMirror').first(),
  codeLine: () => page.locator('.response-pane .editor-container .CodeMirror-line'),
  jsonTreeLine: () => page.locator('.response-pane .object-content'),
  xmlTree: () => page.getByTestId('xml-tree'),
  // Only the XML tree's expand/collapse buttons carry aria-expanded, so this matches
  // every still-collapsed node regardless of depth.
  xmlCollapsedNodeToggles: () => page.getByTestId('xml-tree').locator('button[aria-expanded="false"]'),
  previewErrorBanner: () => page.getByTestId('response-preview-container').getByTestId('error-banner'),
  tabsOverflowButton: () => page.getByTestId('response-pane').getByTestId('responsive-tabs-more'),
  tabsOverflowItem: (tabName: string) => page.locator('.tippy-box .dropdown-item').filter({ hasText: tabName }),
  testSummary: (section: 'preRequest' | 'postResponse' | 'tests' = 'tests') =>
    page.getByTestId(`test-summary-${section}`),
  // Match the fail icon (one per row) rather than a class shared by both the icon and
  // label spans, so each failure counts once, not twice.
  testFailures: () => page.getByTestId('test-result-item').filter({ has: page.getByTestId('test-result-icon-fail') }),
  assertionResults: {
    rows: () => page.getByTestId('test-result-item'),
    passed: () => page.getByTestId('test-result-item').filter({ has: page.getByTestId('test-result-icon-pass') }),
    failed: () => page.getByTestId('test-result-item').filter({ has: page.getByTestId('test-result-icon-fail') })
  }
});

/**
 * Builds locators for the response errors card
 * @param page - The Playwright page object
 * @returns Object with locators for the response errors card elements
 */
export const buildResponseErrorsLocators = (page: Page) => ({
  /** The response errors card */
  card: () => page.getByTestId('response-errors-card'),
  /** Card title: the error title for one error, "N errors" for several */
  title: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-title'),
  closeButton: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-close'),
  fullPaneToggle: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-full-pane-toggle'),
  /** Expand all / collapse all, shown for several errors */
  toggleAll: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-toggle-all'),
  /** Copy button in the header for one error, or within a row */
  copyButton: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-copy'),
  /** Scrollable body holding the detail or the rows */
  body: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-body'),
  /** All error rows, shown for several errors */
  rows: () => page.getByTestId('response-errors-row'),
  /** Nth error row (0-indexed) */
  row: (index: number) => page.getByTestId('response-errors-row').nth(index),
  /** Button that opens and closes a row */
  rowToggle: (row: Locator) => row.getByTestId('response-errors-row-toggle'),
  /** One-line message preview of a collapsed row */
  rowPreview: (row: Locator) => row.getByTestId('response-errors-row-preview'),
  /** Source label within an error detail */
  sourceLabel: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-source-label'),
  /** File path link within an error detail */
  filePath: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-file-path'),
  /** Error message within an error detail */
  message: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-message'),
  /** Code snippet within an error detail */
  codeSnippet: (scope?: Locator) => (scope ?? page).getByTestId('code-snippet'),
  /** Error-highlighted code line within an error detail */
  errorLine: (scope?: Locator) => (scope ?? page).getByTestId('code-line-error'),
  /** Stack trace toggle within an error detail */
  stackTraceToggle: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-stack-trace-toggle'),
  /** Stack trace content within an error detail */
  stackTrace: (scope?: Locator) => (scope ?? page).getByTestId('response-errors-stack-trace'),
  /** Tab-bar icon shown while the card is closed */
  errorIcon: () => page.getByTestId('response-errors-icon'),
  /** Error count badge on the tab-bar icon */
  iconCount: () => page.getByTestId('response-errors-icon-count')
});

const buildLocators = (page: Page) => ({
  response: buildResponseLocators(page)
});

/**
 * Switch the response format
 * @param page - The page object
 * @param format - The format to switch to (e.g., 'JSON', 'HTML', 'XML', 'JavaScript', 'Raw', 'Hex', 'Base64')
 */
export const switchResponseFormat = async (page: Page, format: string) => {
  await test.step(`Switch response format to ${format}`, async () => {
    const responseFormatTab = page.getByTestId('format-response-tab');
    await responseFormatTab.waitFor({ state: 'visible', timeout: 15000 });
    await responseFormatTab.click();
    // Wait for dropdown to be visible before clicking the format option
    const dropdown = page.getByTestId('format-response-tab-dropdown');
    try {
      await dropdown.waitFor({ state: 'visible', timeout: 15000 });
    } catch {
      // If the dropdown didn't appear, try clicking the tab again before failing
      await responseFormatTab.click();
      await dropdown.waitFor({ state: 'visible', timeout: 15000 });
    }
    await dropdown.getByText(format).click();
  });
};

/**
 * Set the response pane's preview/editor mode idempotently.
 *
 * The underlying `preview-response-tab` element is a `<ToggleSwitch>` that
 * flips between editor and preview on click — it has no "set to X" semantics.
 * It also lives inside the dropdown that `format-response-tab` opens, so it's
 * not interactable until that dropdown is visible. Naively clicking it twice
 * (once per call) loses state if any click misses the toggle window, leaving
 * downstream asserts looking at the wrong mode (e.g. expecting CodeMirror
 * lines while preview is showing).
 *
 * Strategy: open the dropdown, read the toggle's current state from its
 * `title` attribute (which reflects `selectedTab` in the source), and click
 * only when the current state differs from the desired one.
 */
const setResponsePreviewMode = async (page: Page, mode: 'editor' | 'preview') => {
  const responseFormatTab = page.getByTestId('format-response-tab');
  await responseFormatTab.click();
  const dropdown = page.getByTestId('format-response-tab-dropdown');
  await dropdown.waitFor({ state: 'visible', timeout: 5000 });
  const toggle = dropdown.getByTestId('preview-response-tab');
  // The toggle's `title` reflects current state (`Turn off|on Preview Mode`).
  // Wait until it's actually one of those values — `getAttribute` returns
  // `null` if read before React flushes props to DOM, which would mislead
  // the state check below into thinking we're already in editor mode and
  // skip the toggle click, leaving us stuck in preview.
  await expect(toggle).toHaveAttribute('title', /^Turn (off|on) Preview Mode$/);
  const isPreview = (await toggle.getAttribute('title')) === 'Turn off Preview Mode';
  const wantPreview = mode === 'preview';
  if (isPreview !== wantPreview) {
    await toggle.click();
  } else {
    // Already in the desired mode — close the dropdown so subsequent
    // interactions (format selection, asserts) aren't shadowed by it.
    await responseFormatTab.click();
  }

  const responsePane = page.getByTestId('response-pane');
  await responsePane.click({
    position: {
      x: 0,
      y: 0
    }
  });
  // Confirm the dropdown actually closed before returning. Otherwise a
  // subsequent format-selector click can land in a half-open state and
  // miss the next interaction.
  await dropdown.waitFor({ state: 'hidden', timeout: 5000 });
};

/**
 * Switch the response pane into preview mode (idempotent).
 */
export const switchToPreviewTab = async (page: Page) => {
  await test.step('Switch to preview tab', async () => {
    await setResponsePreviewMode(page, 'preview');
  });
};

/**
 * Switch the response pane into editor mode (idempotent).
 */
export const switchToEditorTab = async (page: Page) => {
  await test.step('Switch to editor tab', async () => {
    await setResponsePreviewMode(page, 'editor');
  });
};

/**
 * Expand every collapsed node in the XML preview tree.
 *
 * @param page - The page object
 */
export const expandAllXmlNodes = async (page: Page) => {
  await test.step('Expand all XML preview nodes', async () => {
    const collapsedToggles = buildLocators(page).response.xmlCollapsedNodeToggles();
    // One iteration per tree level; the bound guards against a node that fails to
    // expand turning this into an infinite loop.
    const maxDepth = 20;
    for (let depth = 0; depth < maxDepth; depth++) {
      const count = await collapsedToggles.count();
      if (count === 0) return;
      // Expanding a node re-renders its subtree, so walk backwards — clicking the
      // last toggle first keeps the earlier ones' indices stable.
      for (let i = count - 1; i >= 0; i--) {
        await collapsedToggles.nth(i).click();
      }
    }
    throw new Error(`XML tree still has collapsed nodes after ${maxDepth} expansion passes`);
  });
};

/**
 * Get the response body text
 * @param page - The page object
 * @returns The response body text
 */
export const getResponseBody = async (page: Page): Promise<string> => {
  return await page.locator('.response-pane').innerText();
};

export const selectResponsePaneTab = async (page: Page, tabName: string) => {
  await selectPaneTab(page, '[data-testid="response-pane"]', tabName);
};

export const selectResponsePaneTabViaOverflow = async (page: Page, tabName: string) => {
  await test.step(`Select tab "${tabName}" in [data-testid="response-pane"] via overflow`, async () => {
    const locators = buildLocators(page);
    const tab = page.getByTestId('response-pane').locator('.tabs').getByRole('tab', { name: tabName });

    // The overflow button/dropdown can detach mid-click as the tab bar recalculates layout.
    await expect(async () => {
      await locators.response.tabsOverflowButton().click({ timeout: 2000 });
      await locators.response.tabsOverflowItem(tabName).click({ timeout: 2000 });
      await expect(tab).toContainClass('active', { timeout: 2000 });
    }).toPass({ timeout: 15000 });
  });
};

/**
 * Verify response contains specific text
 * @param page - The page object
 * @param texts - Array of texts to verify in the response
 * @returns void
 */
export const expectResponseContains = async (page: Page, texts: string[]) => {
  await test.step('Verify response content', async () => {
    const responsePane = page.locator('.response-pane');
    for (const text of texts) {
      await expect(responsePane).toContainText(text);
    }
  });
};

// Map button testIds to menu item IDs
const buttonToMenuItemMap: Record<string, string> = {
  'response-copy-btn': 'copy-response',
  'response-bookmark-btn': 'save-response',
  'response-download-btn': 'download-response',
  'response-clear-btn': 'clear-response',
  'response-layout-toggle-btn': 'change-layout'
};

// Click a response action - handles both visible buttons and menu items
export const clickResponseAction = async (page: Page, actionTestId: string) => {
  const actionButton = page.getByTestId(actionTestId).first();
  if (await actionButton.isVisible()) {
    await actionButton.click();
  } else {
    // Open the menu dropdown (wait for response pane to fully render)
    const menu = page.getByTestId('response-actions-menu');
    await menu.waitFor({ state: 'visible', timeout: 15000 });
    await menu.click();

    // Click the corresponding menu item
    const menuItemId = buttonToMenuItemMap[actionTestId];
    if (menuItemId) {
      await page.locator(`[role="menuitem"][data-item-id="${menuItemId}"]`).click();
    } else {
      throw new Error(`Unknown action testId: ${actionTestId}. Add mapping to buttonToMenuItemMap.`);
    }
  }
};

/**
 * Clears the response of the open request.
 *
 * Tests in the same file share one app instance, so without this a later test inherits the
 * previous response. The send helpers only wait for a status code to become *visible*, which a
 * stale response already satisfies — so they return before the new response lands and the
 * assertions read the previous test's status, body and test results.
 *
 * Note the clear control is absent while a response carries a transport-level error, so this is a
 * no-op for a request that failed before any response arrived.
 * @param page - The page object
 */
export const resetResponse = async (page: Page) => {
  await test.step('Clear the response', async () => {
    const { response } = buildLocators(page);
    const clearButton = response.clearButton();

    // A snapshot rather than a wait: the caller has just asserted on a rendered response, and a
    // test that failed before one arrived should skip the reset instead of stalling on it.
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await expect(clearButton).toBeHidden();
    }
  });
};

/**
 * Read the visible response preview editor text.
 */
export const readResponsePreviewBody = async (page: Page) => {
  const texts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
  return texts.join('\n');
};
