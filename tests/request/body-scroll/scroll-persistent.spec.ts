import { test, expect, Page } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  createFolder,
  selectRequestPaneTab,
  selectResponsePaneTab,
  selectScriptSubTab,
  openRequest,
  sendRequest
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// ---------------------------------------------------------------------------
// Content generators - produce enough content to make each area scrollable
// ---------------------------------------------------------------------------

const generateLargeJson = () => JSON.stringify(
  { users: Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `User ${i + 1}`, email: `user${i + 1}@example.com` })) },
  null, 2
);

const generateLargeScript = () =>
  Array.from({ length: 80 }, (_, i) => `// Line ${i + 1}\nconsole.log('step ${i + 1}');`).join('\n');

const generateLargeXml = () =>
  `<?xml version="1.0"?>\n<root>\n${Array.from({ length: 150 }, (_, i) => `  <item id="${i + 1}"><name>Item ${i + 1}</name></item>`).join('\n')}\n</root>`;

// ---------------------------------------------------------------------------
// CodeMirror helpers - interact with CM5 instances by CSS selector
// ---------------------------------------------------------------------------

const getEditorScroll = async (page: Page, selector: string): Promise<number> => {
  const editor = page.locator(selector).first();
  return editor.evaluate((el) => {
    const cm = (el as any).CodeMirror;
    if (!cm) return 0;
    const info = cm.getScrollInfo();
    return info?.top ?? 0;
  });
};

const setEditorScroll = async (page: Page, selector: string, scrollTop: number) => {
  const editor = page.locator(selector).first();
  // Ensure content is laid out
  await editor.evaluate((el) => {
    const cm = (el as any).CodeMirror;
    cm?.refresh();
  });
  // Use mouse wheel to simulate real user scrolling
  await editor.hover();
  const box = await editor.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const scrollStep = 200;
    const steps = Math.ceil(scrollTop / scrollStep);
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, scrollStep);
      await page.waitForTimeout(50);
    }
  }
  await page.waitForTimeout(300);

  // In Playwright's Electron environment, CM5's internal 'scroll' event may not
  // fire reliably from mouse.wheel. Emit it manually so the persistence hook's
  // onScroll handler fires and updates scrollPosRef + debounced localStorage save.
  await editor.evaluate((el) => {
    const cm = (el as any).CodeMirror;
    if (cm && cm.constructor?.signal) {
      cm.constructor.signal(cm, 'scroll', cm);
    }
  });
  // Wait for debounced save (200ms) to complete
  await page.waitForTimeout(400);
};

const setEditorContent = async (page: Page, selector: string, content: string) => {
  const editor = page.locator(selector).first();
  await editor.evaluate((el, value) => {
    const cm = (el as any).CodeMirror;
    if (!cm) return;
    cm.setValue(value);
    cm.refresh();
  }, content);
  // Wait for CodeMirror to calculate scroll height for new content
  await page.waitForTimeout(200);
};

// ---------------------------------------------------------------------------
// Body mode helper
// ---------------------------------------------------------------------------

const selectBodyMode = async (page: Page, mode: string) => {
  await page.locator('.body-mode-selector').click();
  await page.locator('.dropdown-item').filter({ hasText: mode }).click();
  await page.waitForTimeout(100);
};

// ---------------------------------------------------------------------------
// Common assertion: scroll position is approximately restored
// ---------------------------------------------------------------------------

// CodeMirror layout sub-pixel rounding, virtualised list buffers, and remount
// timing can shift the restored scroll by a small amount even when persistence
// is working correctly — assert "close to" rather than exact.
const expectScrollRestored = (restored: number, original: number) => {
  expect(restored).toBeGreaterThan(0);
  // 10% tolerance, with a 50px floor so small captured values still pass
  const tolerance = Math.max(50, original * 0.1);
  expect(restored).toBeGreaterThan(original - tolerance);
  expect(restored).toBeLessThan(original + tolerance);
};

// For virtualised tables: assert the first-visible row index is near the expected
// row, tolerating TableVirtuoso's buffer drift (±a few rows).
const expectRowNear = (actual: number, expected: number, tolerance: number = 5) => {
  expect(actual).toBeGreaterThan(expected - tolerance);
  expect(actual).toBeLessThan(expected + tolerance);
};

// ===========================================================================
//  REQUEST PANE - scroll persistence
// ===========================================================================

test.describe('Scroll Position Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });
  // -------------------------------------------------------------------------
  //  Request Pane
  // -------------------------------------------------------------------------

  test.describe('Request Pane', () => {
    test.beforeEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test.afterAll(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('Body (JSON) - scroll persists across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-body-json');

      await test.step('Setup', async () => {
        await createCollection(page, 'scroll-body-json', tmpDir);
        await createRequest(page, 'req-1', 'scroll-body-json', { url: 'https://echo.usebruno.com' });
        await selectRequestPaneTab(page, 'Body');
        await selectBodyMode(page, 'JSON');
        await setEditorContent(page, '.request-pane .CodeMirror', generateLargeJson());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.request-pane .CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Switch to Headers then back to Body', async () => {
        await selectRequestPaneTab(page, 'Headers');
        await selectRequestPaneTab(page, 'Body');
        await setEditorScroll(page, '.request-pane .CodeMirror', 1500);
      });

      await test.step('Scroll down and capture position', async () => {
        saved = await getEditorScroll(page, '.request-pane .CodeMirror');
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to Headers then back to Body', async () => {
        await selectRequestPaneTab(page, 'Headers');

        await selectRequestPaneTab(page, 'Body');
      });

      await test.step('Verify scroll restored', async () => {
        const checkNewPosition = await getEditorScroll(page, '.request-pane .CodeMirror');
        expectScrollRestored(checkNewPosition, saved);
      });
    });

    test('Body (XML) - scroll persists across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-body-xml');

      await test.step('Setup', async () => {
        await createCollection(page, 'scroll-body-xml', tmpDir);
        await createRequest(page, 'req-xml', 'scroll-body-xml', { url: 'https://echo.usebruno.com' });
        await selectRequestPaneTab(page, 'Body');
        await selectBodyMode(page, 'XML');
        await setEditorContent(page, '.request-pane .CodeMirror', generateLargeXml());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.request-pane .CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Initialize hook via tab switch, then scroll', async () => {
        await selectRequestPaneTab(page, 'Params');

        await selectRequestPaneTab(page, 'Body');

        await setEditorScroll(page, '.request-pane .CodeMirror', 1500);
      });

      await test.step('Capture scroll position', async () => {
        saved = await getEditorScroll(page, '.request-pane .CodeMirror');
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to Params then back to Body', async () => {
        await selectRequestPaneTab(page, 'Params');

        await selectRequestPaneTab(page, 'Body');
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, '.request-pane .CodeMirror');
        expectScrollRestored(restored, saved);
      });
    });

    test('Script - pre-request and post-response scroll persists across sub-tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-script');
      const PRE_SELECTOR = '[data-testid="pre-request-script-editor"] .CodeMirror';
      const POST_SELECTOR = '[data-testid="post-response-script-editor"] .CodeMirror';

      let preReqSaved: number;
      let postResSaved: number;

      // --- Pre-request: add content, init hook, scroll, verify ---

      await test.step('Switch to pre-request and add content', async () => {
        await createCollection(page, 'scroll-script', tmpDir);
        await createRequest(page, 'req-script', 'scroll-script', { url: 'https://echo.usebruno.com' });
        await selectScriptSubTab(page, 'pre-request');
        await setEditorContent(page, PRE_SELECTOR, generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, PRE_SELECTOR);
        expect(initial).toBe(0);
      });

      await test.step('Init pre-request hook: switch to Headers and back', async () => {
        await selectRequestPaneTab(page, 'Headers');

        await selectRequestPaneTab(page, 'Script');
      });

      await test.step('Scroll pre-request editor', async () => {
        await selectScriptSubTab(page, 'pre-request');

        await setEditorScroll(page, PRE_SELECTOR, 1500);
        preReqSaved = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(preReqSaved, 1500);
      });

      await test.step('Verify pre-request: switch to Headers and back', async () => {
        await selectRequestPaneTab(page, 'Headers');

        await selectScriptSubTab(page, 'post-response');

        await selectScriptSubTab(page, 'pre-request');

        const restored = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(restored, preReqSaved);
      });

      // --- Post-response: add content, init hook, scroll, verify ---

      await test.step('Switch to post-response and add content', async () => {
        await selectScriptSubTab(page, 'post-response');

        await setEditorContent(page, POST_SELECTOR, generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, POST_SELECTOR);
        expect(initial).toBe(0);
      });

      await test.step('Init post-response hook: switch to Headers and back', async () => {
        await selectRequestPaneTab(page, 'Headers');

        await selectRequestPaneTab(page, 'Script');

        await selectScriptSubTab(page, 'post-response');
      });

      await test.step('Scroll post-response editor', async () => {
        await setEditorScroll(page, POST_SELECTOR, 1500);
        postResSaved = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(postResSaved, 1500);
      });

      await test.step('Verify post-response: switch to Headers and back', async () => {
        await selectRequestPaneTab(page, 'Headers');

        await selectRequestPaneTab(page, 'Script');

        await selectScriptSubTab(page, 'post-response');

        const restored = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(restored, postResSaved);
      });

      // --- Final check: both persist across pre/post sub-tab switch ---

      await test.step('Verify pre-request still persisted after post-response check', async () => {
        await selectScriptSubTab(page, 'pre-request');

        const restored = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(restored, preReqSaved);
      });

      await test.step('Verify post-response still persisted after pre-request check', async () => {
        await selectScriptSubTab(page, 'post-response');

        const restored = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(restored, postResSaved);
      });
    });

    test('Tests editor - scroll persists across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-tests');

      await test.step('Setup', async () => {
        await createCollection(page, 'scroll-tests', tmpDir);
        await createRequest(page, 'req-tests', 'scroll-tests', { url: 'https://echo.usebruno.com' });
        await selectRequestPaneTab(page, 'Tests');
        await setEditorContent(page, '[data-testid="test-script-editor"] .CodeMirror', generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '[data-testid="test-script-editor"] .CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Initialize hook via tab switch, then scroll', async () => {
        await selectRequestPaneTab(page, 'Vars');

        await selectRequestPaneTab(page, 'Tests');

        await setEditorScroll(page, '[data-testid="test-script-editor"] .CodeMirror', 1500);
      });

      await test.step('Capture scroll position', async () => {
        saved = await getEditorScroll(page, '[data-testid="test-script-editor"] .CodeMirror');
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to Body then back to Tests', async () => {
        await selectRequestPaneTab(page, 'Vars');
        await selectRequestPaneTab(page, 'Tests');
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, '[data-testid="test-script-editor"] .CodeMirror');
        expectScrollRestored(restored, saved);
      });
    });

    test('Scroll positions are independent per request', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-per-request');

      await test.step('Setup two requests with JSON bodies', async () => {
        await createCollection(page, 'scroll-per-request', tmpDir);
        await createRequest(page, 'req-a', 'scroll-per-request', { url: 'https://echo.usebruno.com' });
        await createRequest(page, 'req-b', 'scroll-per-request', { url: 'https://echo.usebruno.com' });
      });

      let scrollA: number;

      await test.step('Open req-a, set body, initialize hook via tab switch, then scroll', async () => {
        await openRequest(page, 'scroll-per-request', 'req-a');
        await selectRequestPaneTab(page, 'Body');
        await selectBodyMode(page, 'JSON');
        await setEditorContent(page, '.request-pane .CodeMirror', generateLargeJson());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.request-pane .CodeMirror');
        expect(initial).toBe(0);
      });

      await test.step('Initialize hook via tab switch, then scroll', async () => {
        // Initialize hook
        await selectRequestPaneTab(page, 'Headers');

        await selectRequestPaneTab(page, 'Body');

        await setEditorScroll(page, '.request-pane .CodeMirror', 1500);
      });

      await test.step('Capture scroll position', async () => {
        scrollA = await getEditorScroll(page, '.request-pane .CodeMirror');
        expectScrollRestored(scrollA, 1500);
      });

      await test.step('Switch to req-b', async () => {
        await openRequest(page, 'scroll-per-request', 'req-b');
      });

      await test.step('Switch back to req-a and verify scroll', async () => {
        await openRequest(page, 'scroll-per-request', 'req-a');
        await selectRequestPaneTab(page, 'Body');

        const restored = await getEditorScroll(page, '.request-pane .CodeMirror');
        expectScrollRestored(restored, scrollA);
      });
    });

    test('Request Headers - scroll persists with many headers across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-req-headers');
      const scrollContainer = '.flex-boundary';
      const firstVisibleRowLocator = () => page.getByTestId('editable-table').locator('table > tbody > tr:nth-child(2)');

      await test.step('Setup request and navigate to Headers tab', async () => {
        await createCollection(page, 'scroll-req-headers', tmpDir);
        await createRequest(page, 'req-headers', 'scroll-req-headers', { url: 'https://echo.usebruno.com' });
        await selectRequestPaneTab(page, 'Headers');
      });

      await test.step('Add 100 headers via Bulk Edit', async () => {
        const bulkEditBtn = page.getByTestId('bulk-edit-toggle');
        await bulkEditBtn.scrollIntoViewIfNeeded();
        await bulkEditBtn.click();

        const bulkHeaders = Array.from({ length: 100 }, (_, i) =>
          `X-Custom-Header-${i + 1}:value-${i + 1}`
        ).join('\n');

        // The bulk editor CodeMirror should now be visible in the request pane
        const bulkEditor = page.locator('[data-testid="request-pane"] .CodeMirror').first();
        await bulkEditor.evaluate((el, content) => {
          const cm = (el as any).CodeMirror;
          cm?.setValue(content);
        }, bulkHeaders);

        await page.getByTestId('key-value-edit-toggle').click();
      });

      await test.step('Verify initial scroll is 0', async () => {
        const container = page.locator(scrollContainer).first();
        const initial = await container.evaluate((el) => el.scrollTop);
        expect(initial).toBe(0);
      });

      await test.step('Scroll to ~middle of table (~row 50)', async () => {
        const container = page.locator(scrollContainer).first();
        // Scroll halfway through the virtualised list so ~row 50 becomes the first visible row
        await container.evaluate((el) => { el.scrollTop = el.scrollHeight / 2; });

        // Auto-retry: wait for TableVirtuoso to land on a row in [45, 55]
        // (matches the ~row 50 ± 5 range that expectRowNear asserts)
        const element = firstVisibleRowLocator();
        await expect(element).toHaveAttribute('data-index', /^(4[5-9]|5[0-5])$/, { timeout: 2000 });
      });

      await test.step('Switch to Body tab and back to Headers', async () => {
        await selectRequestPaneTab(page, 'Body');
        await selectRequestPaneTab(page, 'Headers');
        const tableRow = page.getByRole('row', { name: 'Name Value' }).getByRole('cell').first();
        await expect(tableRow).toBeVisible({ timeout: 2000 });
      });

      await test.step('Verify scroll restored to ~row 50', async () => {
        const element = firstVisibleRowLocator();
        const current = parseInt(await element.getAttribute('data-index') as string);
        expectRowNear(current, 50);
      });
    });
  });

  // -------------------------------------------------------------------------
  //  Response Pane
  // -------------------------------------------------------------------------

  test.describe('Response Pane', () => {
    test.beforeEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test.afterAll(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('Response body - scroll persists across response tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-response');
      const responseEditor = '.response-pane .CodeMirror';

      await test.step('Create collection, request, set JSON body and send', async () => {
        await createCollection(page, 'scroll-response', tmpDir);
        await createRequest(page, 'req-resp', 'scroll-response', { url: 'https://jsonplaceholder.typicode.com/todos' });
        await selectRequestPaneTab(page, 'Body');
        await selectBodyMode(page, 'JSON');
        await setEditorContent(page, '.request-pane .CodeMirror', generateLargeJson());
        await sendRequest(page, 200);
      });

      let saved: number;

      await test.step('Initialize hook: switch response tabs', async () => {
        await selectResponsePaneTab(page, 'Response');
        await selectResponsePaneTab(page, 'Headers');
        await selectResponsePaneTab(page, 'Response');
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, responseEditor);
        expect(initial).toBe(0);
      });

      await test.step('Scroll response editor and capture position', async () => {
        await setEditorScroll(page, responseEditor, 1500);
        saved = await getEditorScroll(page, responseEditor);
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to Headers tab and back', async () => {
        await selectResponsePaneTab(page, 'Headers');

        await selectResponsePaneTab(page, 'Response');
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, responseEditor);
        expectScrollRestored(restored, saved);
      });
    });

    test('Response headers - scroll persists across response tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-response-headers');
      const headersContainer = '.response-tab-content';

      await test.step('Create collection, request and send to get response headers', async () => {
        await createCollection(page, 'scroll-response-headers', tmpDir);
        await createRequest(page, 'req-resp-headers', 'scroll-response-headers', { url: 'https://jsonplaceholder.typicode.com/todos' });
        await sendRequest(page, 200);
      });

      let saved: number;

      await test.step('Initialize hook: switch response tabs', async () => {
        await selectResponsePaneTab(page, 'Headers');

        await selectResponsePaneTab(page, 'Response');

        await selectResponsePaneTab(page, 'Headers');
      });

      await test.step('Verify initial scroll is 0', async () => {
        const container = page.locator(headersContainer).first();
        const initial = await container.evaluate((el) => el.scrollTop);
        expect(initial).toBe(0);
      });

      await test.step('Scroll response headers and capture position', async () => {
        const container = page.locator(headersContainer).first();
        await container.evaluate((el) => { el.scrollTop = 200; });

        saved = await container.evaluate((el) => el.scrollTop);
        expectScrollRestored(saved, 200);
      });

      await test.step('Switch to Response tab and back to Headers', async () => {
        await selectResponsePaneTab(page, 'Response');

        await selectResponsePaneTab(page, 'Headers');
      });

      await test.step('Verify scroll restored', async () => {
        const container = page.locator(headersContainer).first();
        const restored = await container.evaluate((el) => el.scrollTop);
        expectScrollRestored(restored, saved);
      });
    });

    test('Response timeline - scroll persists across response tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-response-timeline');
      const timelineScroller = '.timeline-container';

      await test.step('Create collection and request', async () => {
        await createCollection(page, 'scroll-response-timeline', tmpDir);
        await createRequest(page, 'req-timeline', 'scroll-response-timeline', { url: 'http://localhost:8081' });
      });

      await test.step('Send and cancel requests to generate timeline entries', async () => {
        const sendBtn = page.getByTestId('send-arrow-icon');
        for (let i = 0; i < 25; i++) {
          await sendBtn.click({ timeout: 2000 });
          // Immediately cancel - we just need the timeline entry, not the response
          await sendBtn.click({ timeout: 2000 });
        }
      });

      let saved: number;

      await test.step('Switch to Timeline tab', async () => {
        await selectResponsePaneTab(page, 'Timeline');
      });

      await test.step('Initialize hook: switch tabs', async () => {
        await selectResponsePaneTab(page, 'Response');

        await selectResponsePaneTab(page, 'Timeline');
      });

      await test.step('Verify initial scroll is 0', async () => {
        const container = page.locator(timelineScroller).first().locator('..');
        const initial = await container.evaluate((el) => el.scrollTop);
        expect(initial).toBe(0);
      });

      await test.step('Scroll timeline and capture position', async () => {
        // Timeline StyledWrapper is the parent of .timeline-container
        const container = page.locator(timelineScroller).first();
        const scrollParent = container.locator('..');
        await scrollParent.evaluate((el) => { el.scrollTop = 500; });

        saved = await scrollParent.evaluate((el) => el.scrollTop);
        expectScrollRestored(saved, 500);
      });

      await test.step('Switch to Response tab and back to Timeline', async () => {
        await selectResponsePaneTab(page, 'Response');

        await selectResponsePaneTab(page, 'Timeline');
      });

      await test.step('Verify scroll restored', async () => {
        const container = page.locator(timelineScroller).first();
        const scrollParent = container.locator('..');
        const restored = await scrollParent.evaluate((el) => el.scrollTop);
        expectScrollRestored(restored, saved);
      });
    });
  });

  // -------------------------------------------------------------------------
  //  Folder Settings
  // -------------------------------------------------------------------------

  test.describe('Folder Settings', () => {
    test.beforeEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test.afterAll(async ({ page }) => {
      await closeAllCollections(page);
    });

    test('Folder Script - scroll persists across sub-tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-folder-script');
      const locators = buildCommonLocators(page);

      await test.step('Setup folder', async () => {
        await createCollection(page, 'scroll-folder-script', tmpDir);
        await createFolder(page, 'test-folder', 'scroll-folder-script');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
      });

      await test.step('Navigate to Script tab and fill pre-request', async () => {
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        await setEditorContent(page, '.CodeMirror', generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Initialize hook via tab switch, then scroll', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        await setEditorScroll(page, '.CodeMirror', 400);
      });

      await test.step('Capture scroll position', async () => {
        saved = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(saved, 400);
      });

      await test.step('Switch to post-response and back', async () => {
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(restored, saved);
      });
    });

    test('Folder Tests - scroll persists across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-folder-tests');
      const locators = buildCommonLocators(page);

      await test.step('Setup folder and add test content', async () => {
        await createCollection(page, 'scroll-folder-tests', tmpDir);
        await createFolder(page, 'test-folder', 'scroll-folder-tests');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('test').click({ timeout: 2000 });
        await setEditorContent(page, '.CodeMirror', generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Initialize hook via tab switch, then scroll', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('test').click({ timeout: 2000 });
        await setEditorScroll(page, '.CodeMirror', 1500);
      });

      await test.step('Capture scroll position', async () => {
        saved = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to headers and back', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('test').click({ timeout: 2000 });
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(restored, saved);
      });
    });

    test('Folder Docs - scroll persists in edit mode across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-folder-docs');
      const locators = buildCommonLocators(page);
      const largeDocContent = Array.from({ length: 80 }, (_, i) => `## Section ${i + 1}\nLorem ipsum dolor sit amet for section ${i + 1}.`).join('\n\n');

      await test.step('Setup folder and navigate to Docs tab', async () => {
        await createCollection(page, 'scroll-folder-docs', tmpDir);
        await createFolder(page, 'test-folder', 'scroll-folder-docs');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('docs').click({ timeout: 2000 });
      });

      await test.step('Click Edit and add large doc content', async () => {
        const editToggle = page.locator('.editing-mode');
        await editToggle.click({ timeout: 2000 });
        await setEditorContent(page, '.CodeMirror', largeDocContent);
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Initialize hook via tab switch, then scroll', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('docs').click({ timeout: 2000 });
        await setEditorScroll(page, '.CodeMirror', 1500);
      });

      await test.step('Capture scroll position', async () => {
        saved = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to headers and back to docs edit mode', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('docs').click({ timeout: 2000 });
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(restored, saved);
      });
    });

    test('Folder Script pre-request - scroll persists across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-folder-pre-req');
      const locators = buildCommonLocators(page);
      const PRE_SELECTOR = '[data-testid="folder-pre-request-script-editor"] .CodeMirror';

      let saved: number;

      await test.step('Setup folder and add pre-request content', async () => {
        await createCollection(page, 'scroll-folder-pre-req', tmpDir);
        await createFolder(page, 'test-folder', 'scroll-folder-pre-req');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        await setEditorContent(page, PRE_SELECTOR, generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, PRE_SELECTOR);
        expect(initial).toBe(0);
      });

      await test.step('Init hook: switch tabs', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
      });

      await test.step('Scroll pre-request editor', async () => {
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        await setEditorScroll(page, PRE_SELECTOR, 1500);
        saved = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to headers and back', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(restored, saved);
      });
    });

    test('Folder Script post-response - scroll persists across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-folder-post-res');
      const locators = buildCommonLocators(page);
      const POST_SELECTOR = '[data-testid="folder-post-response-script-editor"] .CodeMirror';

      let saved: number;

      await test.step('Setup folder and add post-response content', async () => {
        await createCollection(page, 'scroll-folder-post-res', tmpDir);
        await createFolder(page, 'test-folder', 'scroll-folder-post-res');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
        await setEditorContent(page, POST_SELECTOR, generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, POST_SELECTOR);
        expect(initial).toBe(0);
      });

      await test.step('Init hook: switch tabs', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
      });

      await test.step('Scroll post-response editor', async () => {
        await setEditorScroll(page, POST_SELECTOR, 1500);
        saved = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to headers and back', async () => {
        await locators.paneTabs.folderSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(restored, saved);
      });
    });
  });

  // -------------------------------------------------------------------------
  //  Collection Settings
  // -------------------------------------------------------------------------

  test.describe('Collection Settings', () => {
    test.beforeEach(async ({ page }) => {
      await closeAllCollections(page);
    });

    test.afterAll(async ({ page }) => {
      await closeAllCollections(page);
    });

    // Helper to open collection settings
    const openCollectionSettings = async (page: Page, collName: string) => {
      const locators = buildCommonLocators(page);
      await locators.sidebar.collection(collName).hover();
      await locators.actions.collectionActions(collName).click({ timeout: 2000 });
      await locators.dropdown.item('Settings').click({ timeout: 2000 });
    };

    test('Collection Script - pre-request and post-response scroll persists', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-coll-script');
      const locators = buildCommonLocators(page);
      const PRE_SELECTOR = '[data-testid="collection-pre-request-script-editor"] .CodeMirror';
      const POST_SELECTOR = '[data-testid="collection-post-response-script-editor"] .CodeMirror';

      let preReqSaved: number;
      let postResSaved: number;

      // --- Pre-request ---

      await test.step('Setup collection and add pre-request content', async () => {
        await createCollection(page, 'scroll-coll-script', tmpDir);
        await openCollectionSettings(page, 'scroll-coll-script');
        await locators.paneTabs.collectionSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        await setEditorContent(page, PRE_SELECTOR, generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, PRE_SELECTOR);
        expect(initial).toBe(0);
      });

      await test.step('Init pre-request hook: switch tabs', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('script').click({ timeout: 2000 });
      });

      await test.step('Scroll pre-request editor', async () => {
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        await setEditorScroll(page, PRE_SELECTOR, 1500);
        preReqSaved = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(preReqSaved, 1500);
      });

      await test.step('Verify pre-request: switch to headers and back', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        const restored = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(restored, preReqSaved);
      });

      // --- Post-response ---

      await test.step('Switch to post-response and add content', async () => {
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
        await setEditorContent(page, POST_SELECTOR, generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, POST_SELECTOR);
        expect(initial).toBe(0);
      });

      await test.step('Init post-response hook: switch tabs', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
      });

      await test.step('Scroll post-response editor', async () => {
        await setEditorScroll(page, POST_SELECTOR, 1500);
        postResSaved = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(postResSaved, 1500);
      });

      await test.step('Verify post-response: switch to headers and back', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
        const restored = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(restored, postResSaved);
      });

      // --- Final cross-check ---

      await test.step('Verify pre-request still persisted', async () => {
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
        const restored = await getEditorScroll(page, PRE_SELECTOR);
        expectScrollRestored(restored, preReqSaved);
      });

      await test.step('Verify post-response still persisted', async () => {
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
        const restored = await getEditorScroll(page, POST_SELECTOR);
        expectScrollRestored(restored, postResSaved);
      });
    });

    test('Collection Tests - scroll persists across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-coll-tests');
      const locators = buildCommonLocators(page);

      await test.step('Setup and add test content', async () => {
        await createCollection(page, 'scroll-coll-tests', tmpDir);
        await openCollectionSettings(page, 'scroll-coll-tests');
        await locators.paneTabs.collectionSettingsTab('tests').click({ timeout: 2000 });
        await setEditorContent(page, '.CodeMirror', generateLargeScript());
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Init hook via tab switch, then scroll', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('tests').click({ timeout: 2000 });
        await setEditorScroll(page, '.CodeMirror', 1500);
      });

      await test.step('Capture scroll position', async () => {
        saved = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to headers and back', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('tests').click({ timeout: 2000 });
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(restored, saved);
      });
    });

    test('Collection Docs - scroll persists in edit mode across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-coll-docs');
      const locators = buildCommonLocators(page);
      const largeDocContent = Array.from({ length: 80 }, (_, i) => `## Section ${i + 1}\nLorem ipsum dolor sit amet for section ${i + 1}.`).join('\n\n');

      await test.step('Setup and navigate to Docs tab', async () => {
        await createCollection(page, 'scroll-coll-docs', tmpDir);
        await openCollectionSettings(page, 'scroll-coll-docs');
        await locators.paneTabs.collectionSettingsTab('overview').click({ timeout: 2000 });
      });

      await test.step('Click Edit and add large doc content', async () => {
        // Collection docs has an edit icon button
        const editBtn = page.locator('.editing-mode');
        await editBtn.click({ timeout: 2000 });
        await setEditorContent(page, '.CodeMirror', largeDocContent);
      });

      await test.step('Verify initial scroll is 0', async () => {
        const initial = await getEditorScroll(page, '.CodeMirror');
        expect(initial).toBe(0);
      });

      let saved: number;

      await test.step('Init hook via tab switch, then scroll', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('overview').click({ timeout: 2000 });
        await setEditorScroll(page, '.CodeMirror', 1500);
      });

      await test.step('Capture scroll position', async () => {
        saved = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(saved, 1500);
      });

      await test.step('Switch to headers and back to docs edit mode', async () => {
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('overview').click({ timeout: 2000 });
      });

      await test.step('Verify scroll restored', async () => {
        const restored = await getEditorScroll(page, '.CodeMirror');
        expectScrollRestored(restored, saved);
      });
    });

    test('Collection Headers - scroll persists with many headers across tab switches', async ({ page, createTmpDir }) => {
      const tmpDir = await createTmpDir('scroll-coll-headers');
      const locators = buildCommonLocators(page);
      const scrollContainer = '.collection-settings-content';
      const firstVisibleRowLocator = () => page.getByTestId('editable-table').locator('table > tbody > tr:nth-child(2)');

      await test.step('Setup and navigate to Headers tab', async () => {
        await createCollection(page, 'scroll-coll-headers', tmpDir);
        await openCollectionSettings(page, 'scroll-coll-headers');
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
      });

      await test.step('Add 100 headers via Bulk Edit', async () => {
        const bulkEditBtn = page.getByTestId('bulk-edit-toggle');
        await bulkEditBtn.scrollIntoViewIfNeeded();
        await bulkEditBtn.click({ timeout: 2000 });

        const bulkHeaders = Array.from({ length: 100 }, (_, i) =>
          `X-Custom-Header-${i + 1}:value-${i + 1}`
        ).join('\n');

        const bulkEditor = page.locator('.CodeMirror').first();
        await bulkEditor.evaluate((el, content) => {
          const cm = (el as any).CodeMirror;
          cm?.setValue(content);
        }, bulkHeaders);

        await page.getByTestId('key-value-edit-toggle').click({ timeout: 2000 });
      });

      await test.step('Verify initial scroll is 0', async () => {
        const container = page.locator(scrollContainer).first();
        const initial = await container.evaluate((el) => el.scrollTop);
        expect(initial).toBe(0);
      });

      await test.step('Scroll to ~middle of table (~row 50)', async () => {
        const container = page.locator(scrollContainer).first();
        // Scroll halfway through the virtualised list so ~row 50 becomes the first visible row
        await container.evaluate((el) => { el.scrollTop = el.scrollHeight / 2; });

        // Auto-retry: wait for TableVirtuoso to land on a row in [45, 55]
        // (matches the ~row 50 ± 5 range that expectRowNear asserts)
        const element = firstVisibleRowLocator();
        await expect(element).toHaveAttribute('data-index', /^(4[5-9]|5[0-5])$/, { timeout: 2000 });
      });

      await test.step('Switch to script tab and back to headers', async () => {
        await locators.paneTabs.collectionSettingsTab('script').click({ timeout: 2000 });
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
        const tableRow = page.getByRole('row', { name: 'Name Value' }).getByRole('cell').first();
        await expect(tableRow).toBeVisible({ timeout: 2000 });
      });

      await test.step('Verify scroll restored to ~row 50', async () => {
        const element = firstVisibleRowLocator();
        const current = parseInt(await element.getAttribute('data-index') as string);
        expectRowNear(current, 50);
      });
    });
  });
});
