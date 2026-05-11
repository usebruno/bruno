import { test, expect, Page, Locator } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequestAndWaitForResponse
} from '../utils/page';

const ECHO_URL = 'http://localhost:8081/api/echo/json';

// JSON body that contains BOTH `{}` and `[]` foldable blocks. We send it to
// /echo so the response panel mirrors it back unchanged — same structure to
// fold on either side of the request/response boundary.
const SAMPLE_BODY = JSON.stringify(
  {
    user: {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com'
    },
    items: [
      { sku: 'A-001', qty: 1 },
      { sku: 'A-002', qty: 2 },
      { sku: 'A-003', qty: 3 }
    ],
    meta: {
      createdAt: '2024-01-01T00:00:00Z',
      tags: ['x', 'y', 'z']
    }
  },
  null,
  2
);

// A larger body with five foldable blocks each carrying a *different* item
// count, so we can assert on `↤4↦`, `↤5↦`, `↤3↦`, `↤6↦`, `↤2↦` independently.
// Line numbers (0-indexed) for the OPENING brace/bracket of each block:
//   1  → user      object  (4 keys)    → ↤4↦
//   7  → items     array   (5 elems)   → ↤5↦  (each elem is a 2-key object)
//   29 → address   object  (3 keys)    → ↤3↦
//   34 → tags      array   (6 strings) → ↤6↦
//   42 → meta      object  (2 keys)    → ↤2↦

const LARGE_BODY = JSON.stringify(
  {
    user: {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin'
    },
    items: [
      { sku: 'A-001', qty: 1 },
      { sku: 'A-002', qty: 2 },
      { sku: 'A-003', qty: 3 },
      { sku: 'A-004', qty: 4 },
      { sku: 'A-005', qty: 5 }
    ],
    address: {
      city: 'NYC',
      zip: '10001',
      country: 'US'
    },
    tags: ['x', 'y', 'z', 'a', 'b', 'c'],
    meta: {
      createdAt: '2024-01-01',
      version: 2
    }
  },
  null,
  2
);

// --- Helpers --------------------------------------------------------------

const cmFor = (page: Page, scope: Locator) => scope.locator('.CodeMirror').first();

const setBodyContent = async (page: Page, value: string) => {
  await cmFor(page, page.locator('.request-pane')).evaluate(
    (el, v) => (el as any).CodeMirror?.setValue(v),
    value
  );
};

const selectBodyMode = async (page: Page, mode: 'JSON' | 'XML' | 'Text') => {
  await page.locator('.body-mode-selector').click();
  await page.locator('.dropdown-item').filter({ hasText: mode }).click();
};

// Fold the block opening on the given line number (0-indexed). Driven through
// CM's API so we don't depend on gutter pixel positions.
const foldLine = async (cm: Locator, line: number) =>
  cm.evaluate((el, l) => {
    const editor = (el as any).CodeMirror;
    if (!editor) return;
    // Position at end of the line — brace-fold scans backward to find the {/[
    const lineText = editor.getLine(l) ?? '';
    editor.foldCode({ line: l, ch: lineText.length }, null, 'fold');
  }, line);

// --- Tests ----------------------------------------------------------------

test.describe('CodeEditor — fold state persists across tab switches', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Body editor: folded {} block survives Body → Headers → Body', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-body-curly', await createTmpDir('fold-body-curly'));
    await createRequest(page, 'echo-curly', 'fold-body-curly', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-body-curly', 'echo-curly');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    const bodyCm = cmFor(page, page.locator('.request-pane'));

    // Fold the `user: {` block on line 1. The `user` object has 3 keys
    // (id, name, email), so the widget renders as `↤3↦`.
    await foldLine(bodyCm, 1);
    await expect(bodyCm.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(bodyCm.getByText('↤3↦')).toHaveCount(1);

    // Sub-tab switch — Headers unmounts the body editor in Bruno's request pane.
    await selectRequestPaneTab(page, 'Headers');
    await selectRequestPaneTab(page, 'Body');

    // Fold widget reappears on return — same count and same item-count widget.
    const restored = cmFor(page, page.locator('.request-pane'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(restored.getByText('↤3↦')).toHaveCount(1);
  });

  test('Body editor: folded [] block survives Body → Headers → Body', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-body-array', await createTmpDir('fold-body-array'));
    await createRequest(page, 'echo-array', 'fold-body-array', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-body-array', 'echo-array');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    const bodyCm = cmFor(page, page.locator('.request-pane'));

    // The `items: [` block — first array opening in SAMPLE_BODY (line 6).
    // The array has 3 elements, so the widget shows `↤3↦`.
    await foldLine(bodyCm, 6);
    await expect(bodyCm.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(bodyCm.getByText('↤3↦')).toHaveCount(1);

    await selectRequestPaneTab(page, 'Headers');
    await selectRequestPaneTab(page, 'Body');

    const restored = cmFor(page, page.locator('.request-pane'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(restored.getByText('↤3↦')).toHaveCount(1);
  });

  test('Body editor: nested {} + [] folds both restore on return', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-body-nested', await createTmpDir('fold-body-nested'));
    await createRequest(page, 'echo-nested', 'fold-body-nested', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-body-nested', 'echo-nested');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    const bodyCm = cmFor(page, page.locator('.request-pane'));

    // Fold both an object and an array. user has 3 keys, items has 3 elements,
    // so both widgets show `↤3↦` — total of two `↤3↦` markers in the editor.
    await foldLine(bodyCm, 1); // user: {
    await foldLine(bodyCm, 6); // items: [
    await expect(bodyCm.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(bodyCm.getByText('↤3↦')).toHaveCount(2);

    await selectRequestPaneTab(page, 'Headers');
    await selectRequestPaneTab(page, 'Body');

    const restored = cmFor(page, page.locator('.request-pane'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(restored.getByText('↤3↦')).toHaveCount(2);
  });

  test('Response editor: folded {} block survives response sub-tab switch', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-response-curly', await createTmpDir('fold-response-curly'));
    await createRequest(page, 'echo-resp-curly', 'fold-response-curly', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-response-curly', 'echo-resp-curly');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    await sendRequestAndWaitForResponse(page);

    const responseCm = cmFor(page, page.locator('[data-testid="response-pane"]'));
    // Fold the same `user: {` block on the response side. /echo mirrors the
    // body, so line numbers and item counts match (3 keys → `↤3↦`).
    await foldLine(responseCm, 1);
    await expect(responseCm.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(responseCm.getByText('↤3↦')).toHaveCount(1);

    // Switch to a different response sub-tab and back — this remounts the
    // response code editor.
    await selectResponsePaneTab(page, 'Headers');
    await selectResponsePaneTab(page, 'Response');

    const restored = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(restored.getByText('↤3↦')).toHaveCount(1);
  });

  test('Response editor: folded [] block survives response sub-tab switch', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-response-array', await createTmpDir('fold-response-array'));
    await createRequest(page, 'echo-resp-array', 'fold-response-array', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-response-array', 'echo-resp-array');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    await sendRequestAndWaitForResponse(page);

    const responseCm = cmFor(page, page.locator('[data-testid="response-pane"]'));
    // items array has 3 elements → widget shows `↤3↦`.
    await foldLine(responseCm, 6);
    await expect(responseCm.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(responseCm.getByText('↤3↦')).toHaveCount(1);

    await selectResponsePaneTab(page, 'Headers');
    await selectResponsePaneTab(page, 'Response');

    const restored = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(1);
    await expect(restored.getByText('↤3↦')).toHaveCount(1);
  });

  test('Folds in body editor survive a parent tab switch (different request)', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-parent-tab', await createTmpDir('fold-parent-tab'));
    await createRequest(page, 'echo-a', 'fold-parent-tab', { url: ECHO_URL, method: 'POST' });
    await createRequest(page, 'echo-b', 'fold-parent-tab', { url: ECHO_URL, method: 'POST' });

    // Open echo-a from the sidebar (createRequest doesn't auto-open as a tab).
    await openRequest(page, 'fold-parent-tab', 'echo-a');
    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    const cmA = cmFor(page, page.locator('.request-pane'));
    await foldLine(cmA, 1); // user: { (3 keys)
    await foldLine(cmA, 6); // items: [ (3 elements)
    await expect(cmA.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(cmA.getByText('↤3↦')).toHaveCount(2);

    // Switch to echo-b — opens it as a parent tab.
    await openRequest(page, 'fold-parent-tab', 'echo-b');

    // Switch back to echo-a from the sidebar.
    await openRequest(page, 'fold-parent-tab', 'echo-a');

    // Folds restored — both `↤3↦` widgets reappear.
    const restored = cmFor(page, page.locator('.request-pane'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(restored.getByText('↤3↦')).toHaveCount(2);
  });

  test('Two requests do not share fold state', async ({ page, createTmpDir }) => {
    await createCollection(page, 'fold-isolation', await createTmpDir('fold-isolation'));
    await createRequest(page, 'req-a', 'fold-isolation', { url: ECHO_URL, method: 'POST' });
    await createRequest(page, 'req-b', 'fold-isolation', { url: ECHO_URL, method: 'POST' });

    // req-a: body with two folds (user 3 keys + items 3 elements).
    await openRequest(page, 'fold-isolation', 'req-a');
    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);
    const cmReqA = cmFor(page, page.locator('.request-pane'));
    await foldLine(cmReqA, 1);
    await foldLine(cmReqA, 6);
    await expect(cmReqA.getByText('↤3↦')).toHaveCount(2);

    // req-b: same body, no folds.
    await openRequest(page, 'fold-isolation', 'req-b');
    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    // Editor for req-b shows the body unfolded — zero `↤3↦` widgets, no fold markers.
    const cmReqB = cmFor(page, page.locator('.request-pane'));
    await expect(cmReqB.locator('.CodeMirror-foldmarker')).toHaveCount(0);
    await expect(cmReqB.getByText('↤3↦')).toHaveCount(0);

    // Switch back to req-a from the sidebar — its folds are still there.
    await openRequest(page, 'fold-isolation', 'req-a');
    const restored = cmFor(page, page.locator('.request-pane'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(restored.getByText('↤3↦')).toHaveCount(2);
  });
});

test.describe('CodeEditor — undo (Cmd-Z) survives a tab switch', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  // Helper used by the multi-tab undo tests below. Focuses the body editor and
  // moves the cursor to a known spot before typing, so the keystrokes don't
  // interleave into existing JSON.
  const focusEndOfBody = async (page: Page) => {
    const cm = cmFor(page, page.locator('.request-pane'));
    await cm.evaluate((el) => {
      const editor = (el as any).CodeMirror;
      editor.focus();
      const lastLine = editor.lastLine();
      editor.setCursor({ line: lastLine, ch: 0 });
    });
    return cm;
  };

  const undoShortcut = process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z';
  const redoShortcut = process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Shift+Z';

  test('Editing the body, switching sub-tab, returning, and pressing undo reverts the edit', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'undo-body', await createTmpDir('undo-body'));
    await createRequest(page, 'echo-undo', 'undo-body', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'undo-body', 'echo-undo');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    const bodyCm = cmFor(page, page.locator('.request-pane'));

    // Type a unique sentinel as a "user edit". Position the cursor at the end
    // first so the typed text doesn't interleave into existing JSON.
    await bodyCm.evaluate((el) => {
      const editor = (el as any).CodeMirror;
      editor.focus();
      const lastLine = editor.lastLine();
      editor.setCursor({ line: lastLine, ch: 0 });
    });
    await page.keyboard.type('// SENTINEL_FROM_TEST\n');

    await expect(bodyCm).toContainText('SENTINEL_FROM_TEST');

    // Switch sub-tab and back — the editor unmounts and remounts.
    await selectRequestPaneTab(page, 'Headers');
    await selectRequestPaneTab(page, 'Body');

    // Bring focus back to the editor and undo. Use the appropriate platform
    // shortcut. CodeMirror's history was rebuilt from localStorage on remount.
    const cmAfter = cmFor(page, page.locator('.request-pane'));
    await cmAfter.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');

    // The sentinel is gone — undo replayed the saved history.
    await expect(cmAfter).not.toContainText('SENTINEL_FROM_TEST');
  });

  test('Body content + undo history survive walking through Headers / Params / Vars / Script', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'undo-walk', await createTmpDir('undo-walk'));
    await createRequest(page, 'echo-walk', 'undo-walk', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'undo-walk', 'echo-walk');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    await focusEndOfBody(page);
    await page.keyboard.type('// SENTINEL_WALK\n');

    // After every sub-tab visit, return to Body and assert the marker is still
    // there. This proves no individual switch silently discards content.
    for (const subTab of ['Headers', 'Params', 'Vars', 'Script'] as const) {
      await selectRequestPaneTab(page, subTab);
      await selectRequestPaneTab(page, 'Body');
      await expect(cmFor(page, page.locator('.request-pane')))
        .toContainText('SENTINEL_WALK');
    }

    // Undo at the very end — the saved history must include the typed line
    // even after four remounts.
    const cmAfter = cmFor(page, page.locator('.request-pane'));
    await cmAfter.click();
    await page.keyboard.press(undoShortcut);
    await expect(cmAfter).not.toContainText('SENTINEL_WALK');
  });

  test('Cmd-Z reverts an edit when applied after each sub-tab return', async ({
    page,
    createTmpDir
  }) => {
    // Independently verify undo for every sub-tab — type a unique sentinel,
    // visit one sub-tab and return, undo, assert clean. This catches a sub-tab
    // whose remount path corrupts the history while others stay healthy.
    await createCollection(page, 'undo-each-tab', await createTmpDir('undo-each-tab'));
    await createRequest(page, 'echo-each', 'undo-each-tab', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'undo-each-tab', 'echo-each');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    const subTabs = ['Headers', 'Params', 'Vars', 'Script'] as const;
    for (const subTab of subTabs) {
      const sentinel = `// SENTINEL_${subTab.toUpperCase()}`;

      await focusEndOfBody(page);
      await page.keyboard.type(`${sentinel}\n`);
      await expect(cmFor(page, page.locator('.request-pane'))).toContainText(sentinel);

      await selectRequestPaneTab(page, subTab);
      await selectRequestPaneTab(page, 'Body');

      // Sentinel still visible after the round-trip.
      const cmAfter = cmFor(page, page.locator('.request-pane'));
      await expect(cmAfter).toContainText(sentinel);

      // Undo just the line we added — restoring the editor to clean SAMPLE_BODY.
      await cmAfter.click();
      await page.keyboard.press(undoShortcut);
      await expect(cmAfter).not.toContainText(sentinel);
    }
  });

  test('Cmd-Shift-Z (redo) restores a previously undone edit across a tab switch', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'undo-redo', await createTmpDir('undo-redo'));
    await createRequest(page, 'echo-redo', 'undo-redo', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'undo-redo', 'echo-redo');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    await focusEndOfBody(page);
    await page.keyboard.type('// SENTINEL_REDO\n');

    const cm = cmFor(page, page.locator('.request-pane'));
    await expect(cm).toContainText('SENTINEL_REDO');

    // Round-trip the editor through a sub-tab, then undo.
    await selectRequestPaneTab(page, 'Headers');
    await selectRequestPaneTab(page, 'Body');

    let cmAfter = cmFor(page, page.locator('.request-pane'));
    await cmAfter.click();
    await page.keyboard.press(undoShortcut);
    await expect(cmAfter).not.toContainText('SENTINEL_REDO');

    // Redo brings the line back. This proves the saved history kept the
    // `undone` stack — not just the `done` stack.
    await page.keyboard.press(redoShortcut);
    await expect(cmAfter).toContainText('SENTINEL_REDO');

    // One more sub-tab round-trip — redo state must persist through it.
    await selectRequestPaneTab(page, 'Vars');
    await selectRequestPaneTab(page, 'Body');
    cmAfter = cmFor(page, page.locator('.request-pane'));
    await expect(cmAfter).toContainText('SENTINEL_REDO');

    // Final undo cleans up.
    await cmAfter.click();
    await page.keyboard.press(undoShortcut);
    await expect(cmAfter).not.toContainText('SENTINEL_REDO');
  });

  test('Multi-step undo preserves edit order across a tab switch', async ({
    page,
    createTmpDir
  }) => {
    // Type three discrete edits, switch sub-tab, switch back, then undo three
    // times — each undo must remove the most-recent sentinel, in reverse order.
    //
    // We bypass `page.keyboard.type` here on purpose: CodeMirror groups rapid
    // typed edits sharing the default `+input` origin into a single undo step
    // (controlled by `historyEventDelay`, default 1250ms). To force three
    // distinct undo entries we call `replaceRange` directly with `*`-prefixed
    // origins — CM5 never merges history entries whose origin starts with `*`.
    await createCollection(page, 'undo-multi', await createTmpDir('undo-multi'));
    await createRequest(page, 'echo-multi', 'undo-multi', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'undo-multi', 'echo-multi');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    // Insert all three sentinels in one `evaluate` (no `await` between calls):
    await cmFor(page, page.locator('.request-pane')).evaluate((el) => {
      const editor = (el as any).CodeMirror;
      editor.focus();
      const doc = editor.getDoc();
      const append = (sentinel: string, originSuffix: string) => {
        const lastLine = doc.lastLine();
        const lastLineLen = doc.getLine(lastLine).length;
        doc.replaceRange(
          `\n${sentinel}`,
          { line: lastLine, ch: lastLineLen },
          undefined,
          `*${originSuffix}`
        );
      };
      append('// SENTINEL_ONE', 'sentinel-1');
      append('// SENTINEL_TWO', 'sentinel-2');
      append('// SENTINEL_THREE', 'sentinel-3');
    });

    const cm = cmFor(page, page.locator('.request-pane'));
    await expect(cm).toContainText('SENTINEL_ONE');
    await expect(cm).toContainText('SENTINEL_TWO');
    await expect(cm).toContainText('SENTINEL_THREE');

    await selectRequestPaneTab(page, 'Script');
    await selectRequestPaneTab(page, 'Body');

    const cmAfter = cmFor(page, page.locator('.request-pane'));
    await cmAfter.click();

    // Undo step 1: only SENTINEL_THREE is removed.
    await page.keyboard.press(undoShortcut);
    await expect(cmAfter).not.toContainText('SENTINEL_THREE');
    await expect(cmAfter).toContainText('SENTINEL_TWO');
    await expect(cmAfter).toContainText('SENTINEL_ONE');

    // Undo step 2: SENTINEL_TWO is removed.
    await page.keyboard.press(undoShortcut);
    await expect(cmAfter).not.toContainText('SENTINEL_TWO');
    await expect(cmAfter).toContainText('SENTINEL_ONE');

    // Undo step 3: SENTINEL_ONE is removed — back to clean SAMPLE_BODY.
    await page.keyboard.press(undoShortcut);
    await expect(cmAfter).not.toContainText('SENTINEL_ONE');
  });

  test('Undo persists across switching to a different request and back', async ({
    page,
    createTmpDir
  }) => {
    // Parent-tab switch (different request) is a stronger remount path than
    // sub-tab switches — verify undo history survives that too.
    await createCollection(page, 'undo-parent', await createTmpDir('undo-parent'));
    await createRequest(page, 'echo-undo-a', 'undo-parent', { url: ECHO_URL, method: 'POST' });
    await createRequest(page, 'echo-undo-b', 'undo-parent', { url: ECHO_URL, method: 'POST' });

    // Set up echo-undo-a with an edit.
    await openRequest(page, 'undo-parent', 'echo-undo-a');
    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, SAMPLE_BODY);

    await focusEndOfBody(page);
    await page.keyboard.type('// SENTINEL_PARENT\n');
    await expect(cmFor(page, page.locator('.request-pane'))).toContainText('SENTINEL_PARENT');

    // Bounce through echo-undo-b and back.
    await openRequest(page, 'undo-parent', 'echo-undo-b');
    await openRequest(page, 'undo-parent', 'echo-undo-a');

    const cmAfter = cmFor(page, page.locator('.request-pane'));
    await expect(cmAfter).toContainText('SENTINEL_PARENT');

    // Undo on the rebuilt editor still works.
    await cmAfter.click();
    await page.keyboard.press(undoShortcut);
    await expect(cmAfter).not.toContainText('SENTINEL_PARENT');
  });
});

test.describe('CodeEditor — varied {} / [] folds with distinct widget counts', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Body: all five foldable blocks (4/5/3/6/2 keys) restore with correct widget counts', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-varied-body', await createTmpDir('fold-varied-body'));
    await createRequest(page, 'echo-varied', 'fold-varied-body', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-varied-body', 'echo-varied');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, LARGE_BODY);

    const bodyCm = cmFor(page, page.locator('.request-pane'));

    // Fold each top-level block in order. Each one has a unique item count.
    await foldLine(bodyCm, 1); // user → ↤4↦
    await foldLine(bodyCm, 7); // items → ↤5↦
    await foldLine(bodyCm, 29); // address → ↤3↦
    await foldLine(bodyCm, 34); // tags → ↤6↦
    await foldLine(bodyCm, 42); // meta → ↤2↦

    // Each unique count should appear exactly once in the editor.
    await expect(bodyCm.locator('.CodeMirror-foldmarker')).toHaveCount(5);
    await expect(bodyCm.getByText('↤4↦')).toHaveCount(1);
    await expect(bodyCm.getByText('↤5↦')).toHaveCount(1);
    await expect(bodyCm.getByText('↤3↦')).toHaveCount(1);
    await expect(bodyCm.getByText('↤6↦')).toHaveCount(1);
    await expect(bodyCm.getByText('↤2↦')).toHaveCount(1);

    // Sub-tab round-trip — every fold and its count must reappear.
    await selectRequestPaneTab(page, 'Headers');
    await selectRequestPaneTab(page, 'Body');

    const restored = cmFor(page, page.locator('.request-pane'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(5);
    await expect(restored.getByText('↤4↦')).toHaveCount(1);
    await expect(restored.getByText('↤5↦')).toHaveCount(1);
    await expect(restored.getByText('↤3↦')).toHaveCount(1);
    await expect(restored.getByText('↤6↦')).toHaveCount(1);
    await expect(restored.getByText('↤2↦')).toHaveCount(1);
  });

  test('Body: a random subset of folds restores intact (only items + tags)', async ({
    page,
    createTmpDir
  }) => {
    // Pick a non-trivial subset (the array blocks only) to confirm we don't
    // accidentally over-restore — only the folds the user made should come back.
    await createCollection(page, 'fold-subset-body', await createTmpDir('fold-subset-body'));
    await createRequest(page, 'echo-subset', 'fold-subset-body', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-subset-body', 'echo-subset');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, LARGE_BODY);

    const bodyCm = cmFor(page, page.locator('.request-pane'));

    await foldLine(bodyCm, 7); // items → ↤5↦
    await foldLine(bodyCm, 34); // tags → ↤6↦

    await expect(bodyCm.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(bodyCm.getByText('↤5↦')).toHaveCount(1);
    await expect(bodyCm.getByText('↤6↦')).toHaveCount(1);
    // Object blocks were not folded, their counts must not appear as widgets.
    await expect(bodyCm.getByText('↤4↦')).toHaveCount(0);
    await expect(bodyCm.getByText('↤3↦')).toHaveCount(0);
    await expect(bodyCm.getByText('↤2↦')).toHaveCount(0);

    await selectRequestPaneTab(page, 'Headers');
    await selectRequestPaneTab(page, 'Body');

    const restored = cmFor(page, page.locator('.request-pane'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(restored.getByText('↤5↦')).toHaveCount(1);
    await expect(restored.getByText('↤6↦')).toHaveCount(1);
    await expect(restored.getByText('↤4↦')).toHaveCount(0);
    await expect(restored.getByText('↤3↦')).toHaveCount(0);
    await expect(restored.getByText('↤2↦')).toHaveCount(0);
  });
});

test.describe('CodeEditor — response folds survive Timeline and Headers tab switches', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Response → Timeline → Response preserves multiple varied folds', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-resp-timeline', await createTmpDir('fold-resp-timeline'));
    await createRequest(page, 'echo-resp-timeline', 'fold-resp-timeline', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-resp-timeline', 'echo-resp-timeline');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, LARGE_BODY);

    await sendRequestAndWaitForResponse(page);

    // Fold three blocks of different shapes on the response side. /echo
    // mirrors the body so line numbers match.
    const responseCm = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await foldLine(responseCm, 1); // user → ↤4↦
    await foldLine(responseCm, 7); // items → ↤5↦
    await foldLine(responseCm, 34); // tags → ↤6↦

    await expect(responseCm.locator('.CodeMirror-foldmarker')).toHaveCount(3);
    await expect(responseCm.getByText('↤4↦')).toHaveCount(1);
    await expect(responseCm.getByText('↤5↦')).toHaveCount(1);
    await expect(responseCm.getByText('↤6↦')).toHaveCount(1);

    // Switch to Timeline (no editor on this tab — the response editor unmounts)
    // and back. State must round-trip cleanly through localStorage.
    await selectResponsePaneTab(page, 'Timeline');
    await selectResponsePaneTab(page, 'Response');

    const restored = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(3);
    await expect(restored.getByText('↤4↦')).toHaveCount(1);
    await expect(restored.getByText('↤5↦')).toHaveCount(1);
    await expect(restored.getByText('↤6↦')).toHaveCount(1);
  });

  test('Response → Headers → Response preserves multiple varied folds', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'fold-resp-headers', await createTmpDir('fold-resp-headers'));
    await createRequest(page, 'echo-resp-headers', 'fold-resp-headers', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-resp-headers', 'echo-resp-headers');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, LARGE_BODY);

    await sendRequestAndWaitForResponse(page);

    const responseCm = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await foldLine(responseCm, 7); // items → ↤5↦
    await foldLine(responseCm, 29); // address → ↤3↦
    await foldLine(responseCm, 42); // meta → ↤2↦

    await expect(responseCm.locator('.CodeMirror-foldmarker')).toHaveCount(3);
    await expect(responseCm.getByText('↤5↦')).toHaveCount(1);
    await expect(responseCm.getByText('↤3↦')).toHaveCount(1);
    await expect(responseCm.getByText('↤2↦')).toHaveCount(1);

    await selectResponsePaneTab(page, 'Headers');
    await selectResponsePaneTab(page, 'Response');

    const restored = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(3);
    await expect(restored.getByText('↤5↦')).toHaveCount(1);
    await expect(restored.getByText('↤3↦')).toHaveCount(1);
    await expect(restored.getByText('↤2↦')).toHaveCount(1);
  });

  test('Response folds survive Response → Timeline → Headers → Response chain', async ({
    page,
    createTmpDir
  }) => {
    // Walk through several response sub-tabs without folding back the editor —
    // each transition triggers an unmount/mount of the response editor, so
    // every step exercises the persistence layer.
    await createCollection(page, 'fold-resp-chain', await createTmpDir('fold-resp-chain'));
    await createRequest(page, 'echo-resp-chain', 'fold-resp-chain', {
      url: ECHO_URL,
      method: 'POST'
    });
    await openRequest(page, 'fold-resp-chain', 'echo-resp-chain');

    await selectRequestPaneTab(page, 'Body');
    await selectBodyMode(page, 'JSON');
    await setBodyContent(page, LARGE_BODY);

    await sendRequestAndWaitForResponse(page);

    const responseCm = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await foldLine(responseCm, 1); // user → ↤4↦
    await foldLine(responseCm, 34); // tags → ↤6↦

    await expect(responseCm.getByText('↤4↦')).toHaveCount(1);
    await expect(responseCm.getByText('↤6↦')).toHaveCount(1);

    // Cycle through Timeline → Headers → Response. The editor remounts on each
    // return, so this catches any cumulative state-loss bug.
    await selectResponsePaneTab(page, 'Timeline');
    await selectResponsePaneTab(page, 'Headers');
    await selectResponsePaneTab(page, 'Response');

    const restored = cmFor(page, page.locator('[data-testid="response-pane"]'));
    await expect(restored.locator('.CodeMirror-foldmarker')).toHaveCount(2);
    await expect(restored.getByText('↤4↦')).toHaveCount(1);
    await expect(restored.getByText('↤6↦')).toHaveCount(1);
  });
});
