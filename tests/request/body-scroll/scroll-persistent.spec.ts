import { test, expect, Page } from '../../../playwright';
import {
  closeAllCollections,
  closeAllTabs,
  createCollection,
  createRequest,
  selectRequestPaneTab,
  selectResponsePaneTab,
  selectScriptSubTab,
  openCollection,
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
  await page.locator(selector).first().evaluate((el, top) => {
    const cm = (el as any).CodeMirror;
    if (!cm) return;
    // scrollTo fires CM's internal 'scroll' event, which useTrackScroll listens
    // to via cm.on('scroll'). No mouse simulation needed.
    cm.scrollTo(null, top);
  }, scrollTop);
  // Wait for debounce (200ms) + render buffer
  await page.waitForTimeout(500);
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

// Tests share an Electron worker, so localStorage carries scroll values from one
// test into the next under the same `persisted::<tabUid>::<key>` namespace —
// breaking the "initial scroll is 0" assertion. Wipe just the scroll-persistence
// keys at the start of each test that exercises the fixture collection.
const clearPersistedScrollState = async (page: Page) => {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('persisted::'))
      .forEach((k) => localStorage.removeItem(k));
  });
};

// ===========================================================================
//  REQUEST PANE - scroll persistence
// ===========================================================================

test.describe('Scroll Position Persistence', () => {
  // -------------------------------------------------------------------------
  //  Request Pane
  // -------------------------------------------------------------------------

  test.describe('Request Pane', () => {
    test.beforeEach(async ({ pageWithUserData: page }) => {
      try { await closeAllTabs(page); } catch {}
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 20000 });
      await clearPersistedScrollState(page);
    });

    test('Body (JSON) - scroll persists across tab switches', async ({ pageWithUserData: page }) => {
      await test.step('Setup', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openRequest(page, 'scroll-fixtures', 'body-json');
        await selectRequestPaneTab(page, 'Body');
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

    test('Body (XML) - scroll persists across tab switches', async ({ pageWithUserData: page }) => {
      await test.step('Setup', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openRequest(page, 'scroll-fixtures', 'body-xml');
        await selectRequestPaneTab(page, 'Body');
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

    test('Script - pre-request and post-response scroll persists across sub-tab switches', async ({ pageWithUserData: page }) => {
      const PRE_SELECTOR = '[data-testid="pre-request-script-editor"] .CodeMirror';
      const POST_SELECTOR = '[data-testid="post-response-script-editor"] .CodeMirror';

      let preReqSaved: number;
      let postResSaved: number;

      // --- Pre-request: add content, init hook, scroll, verify ---

      await test.step('Open script request and switch to pre-request', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openRequest(page, 'scroll-fixtures', 'script');
        await selectRequestPaneTab(page, 'Script');
        await selectScriptSubTab(page, 'pre-request');
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

      await test.step('Switch to post-response', async () => {
        await selectScriptSubTab(page, 'post-response');
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

    test('Tests editor - scroll persists across tab switches', async ({ pageWithUserData: page }) => {
      await test.step('Setup', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openRequest(page, 'scroll-fixtures', 'tests', { persist: true });
        await selectRequestPaneTab(page, 'Tests');
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

    test('Scroll positions are independent per request', async ({ pageWithUserData: page }) => {
      await test.step('Open collection', async () => {
        await openCollection(page, 'scroll-fixtures');
      });

      let scrollA: number;

      await test.step('Open req-a and navigate to Body', async () => {
        await openRequest(page, 'scroll-fixtures', 'req-a', { persist: true });
        await selectRequestPaneTab(page, 'Body');
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
        await openRequest(page, 'scroll-fixtures', 'req-b');
      });

      await test.step('Switch back to req-a and verify scroll', async () => {
        await openRequest(page, 'scroll-fixtures', 'req-a');
        await selectRequestPaneTab(page, 'Body');

        const restored = await getEditorScroll(page, '.request-pane .CodeMirror');
        expectScrollRestored(restored, scrollA);
      });
    });

    test('Request Headers - scroll persists with many headers across tab switches', async ({ pageWithUserData: page }) => {
      const scrollContainer = '.flex-boundary';
      const firstVisibleRowLocator = () => page.getByTestId('editable-table').locator('table > tbody > tr:nth-child(2)');

      await test.step('Setup request and navigate to Headers tab', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openRequest(page, 'scroll-fixtures', 'headers-many', { persist: true });
        await selectRequestPaneTab(page, 'Headers');
      });

      await test.step('Verify initial scroll is 0', async () => {
        const container = page.locator(scrollContainer).first();
        const initial = await container.evaluate((el) => el.scrollTop);
        expect(initial).toBe(0);
      });

      await test.step('Scroll to ~middle of table (~row 50)', async () => {
        // Wait for Virtuoso to mount and register its customScrollParent scroll listener
        // before setting scrollTop — otherwise the event fires before the listener exists.
        await expect(firstVisibleRowLocator()).toBeVisible({ timeout: 3000 });
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

    test('Assertions - scroll persists with many assertions across tab switches', async ({ pageWithUserData: page }) => {
      const scrollContainer = '.flex-boundary';
      // Match the first row that actually has a data-index attribute. This skips
      // Virtuoso's optional top-spacer tr (which has no data-index and is only
      // rendered when scrolled past row 0).
      const firstVisibleRowLocator = () =>
        page.getByTestId('assertions-table').locator('table > tbody > tr[data-index]').first();

      await test.step('Setup request and navigate to Assertions tab', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openRequest(page, 'scroll-fixtures', 'assertions-many');
        await selectRequestPaneTab(page, 'Assert');
      });

      await test.step('Verify initial scroll is 0', async () => {
        await expect(firstVisibleRowLocator()).toBeVisible({ timeout: 2000 });
        const container = page.locator(scrollContainer).first();
        const initial = await container.evaluate((el) => el.scrollTop);
        expect(initial).toBe(0);
      });

      await test.step('Scroll to ~middle of table (~row 30)', async () => {
        const container = page.locator(scrollContainer).first();
        await container.evaluate((el) => { el.scrollTop = el.scrollHeight / 2; });

        const element = firstVisibleRowLocator();
        await expect(element).toHaveAttribute('data-index', /^(2[5-9]|3[0-5])$/, { timeout: 2000 });
      });

      await test.step('Switch to Body tab and back to Assert', async () => {
        await selectRequestPaneTab(page, 'Body');
        await selectRequestPaneTab(page, 'Assert');
        const header = page.getByTestId('assertions-table').locator('table thead tr').first();
        await expect(header).toBeVisible({ timeout: 2000 });
      });

      await test.step('Verify scroll restored to ~row 30', async () => {
        const element = firstVisibleRowLocator();
        await expect(element).toHaveAttribute('data-index', /^(2[5-9]|3[0-5])$/, { timeout: 2000 });
        const current = parseInt(await element.getAttribute('data-index') as string);
        expectRowNear(current, 30);
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
        await createRequest(page, 'req-timeline', 'scroll-response-timeline', { url: 'http://localhost:8081/ping' });
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
    test.beforeEach(async ({ pageWithUserData: page }) => {
      try { await closeAllTabs(page); } catch {}
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 20000 });
      await clearPersistedScrollState(page);
    });

    test('Folder Script - scroll persists across sub-tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await test.step('Setup folder', async () => {
        await openCollection(page, 'scroll-fixtures');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
      });

      await test.step('Navigate to Script tab pre-request', async () => {
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
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

    test('Folder Tests - scroll persists across tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await test.step('Open folder and navigate to Tests tab', async () => {
        await openCollection(page, 'scroll-fixtures');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('test').click({ timeout: 2000 });
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

    test('Folder Docs - scroll persists in edit mode across tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await test.step('Open folder and navigate to Docs tab', async () => {
        await openCollection(page, 'scroll-fixtures');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('docs').click({ timeout: 2000 });
      });

      await test.step('Click Edit', async () => {
        const editToggle = page.locator('.editing-mode');
        await editToggle.click({ timeout: 2000 });
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

    test('Folder Script pre-request - scroll persists across tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const PRE_SELECTOR = '[data-testid="folder-pre-request-script-editor"] .CodeMirror';

      let saved: number;

      await test.step('Open folder and navigate to pre-request', async () => {
        await openCollection(page, 'scroll-fixtures');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
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

    test('Folder Script post-response - scroll persists across tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const POST_SELECTOR = '[data-testid="folder-post-response-script-editor"] .CodeMirror';

      let saved: number;

      await test.step('Open folder and navigate to post-response', async () => {
        await openCollection(page, 'scroll-fixtures');
        await locators.sidebar.folder('test-folder').click({ timeout: 2000 });
        await locators.paneTabs.folderSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
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
    test.beforeEach(async ({ pageWithUserData: page }) => {
      try { await closeAllTabs(page); } catch {}
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 20000 });
      await clearPersistedScrollState(page);
    });

    test.afterAll(async ({ pageWithUserData: page }) => {
      await closeAllCollections(page);
    });

    // Helper to open collection settings
    const openCollectionSettings = async (page: Page, collName: string) => {
      const locators = buildCommonLocators(page);
      await locators.sidebar.collection(collName).hover();
      await locators.actions.collectionActions(collName).click({ timeout: 2000 });
      await locators.dropdown.item('Settings').click({ timeout: 2000 });
    };

    test('Collection Script - pre-request and post-response scroll persists', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const PRE_SELECTOR = '[data-testid="collection-pre-request-script-editor"] .CodeMirror';
      const POST_SELECTOR = '[data-testid="collection-post-response-script-editor"] .CodeMirror';

      let preReqSaved: number;
      let postResSaved: number;

      // --- Pre-request ---

      await test.step('Open collection settings and navigate to pre-request', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openCollectionSettings(page, 'scroll-fixtures');
        await locators.paneTabs.collectionSettingsTab('script').click({ timeout: 2000 });
        await page.getByTestId('tab-trigger-pre-request').click({ timeout: 2000 });
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

      await test.step('Switch to post-response', async () => {
        await page.getByTestId('tab-trigger-post-response').click({ timeout: 2000 });
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

    test('Collection Tests - scroll persists across tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await test.step('Open collection settings and navigate to Tests tab', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openCollectionSettings(page, 'scroll-fixtures');
        await locators.paneTabs.collectionSettingsTab('tests').click({ timeout: 2000 });
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

    test('Collection Docs - scroll persists in edit mode across tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);

      await test.step('Open collection settings and navigate to Docs tab', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openCollectionSettings(page, 'scroll-fixtures');
        await locators.paneTabs.collectionSettingsTab('overview').click({ timeout: 2000 });
      });

      await test.step('Click Edit', async () => {
        // Collection docs has an edit icon button
        const editBtn = page.locator('.editing-mode');
        await editBtn.click({ timeout: 2000 });
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

    test('Collection Headers - scroll persists with many headers across tab switches', async ({ pageWithUserData: page }) => {
      const locators = buildCommonLocators(page);
      const scrollContainer = '.collection-settings-content';
      const firstVisibleRowLocator = () => page.getByTestId('editable-table').locator('table > tbody > tr:nth-child(2)');

      await test.step('Open collection settings and navigate to Headers tab', async () => {
        await openCollection(page, 'scroll-fixtures');
        await openCollectionSettings(page, 'scroll-fixtures');
        await locators.paneTabs.collectionSettingsTab('headers').click({ timeout: 2000 });
      });

      await test.step('Verify initial scroll is 0', async () => {
        const container = page.locator(scrollContainer).first();
        const initial = await container.evaluate((el) => el.scrollTop);
        expect(initial).toBe(0);
      });

      await test.step('Scroll to ~middle of table (~row 50)', async () => {
        await expect(firstVisibleRowLocator()).toBeVisible({ timeout: 3000 });
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
