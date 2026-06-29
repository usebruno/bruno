import { test, expect, Page } from '../../playwright';
import { selectRequestPaneTab, closeAllCollections, createCollection, createRequest } from '../utils/page';
import process from 'node:process';

const cmdKey = process.platform === 'darwin' ? 'Meta' : 'Control';
const EDITOR_ID = 'pre-request-script-editor';
const COLLECTION = 'search-replace-test';
const REQUEST = 'SearchRequest';

const LARGE_DOC = Array.from(
  { length: 200 },
  (_, i) =>
    `## Section ${i + 1}\n\n`
    + `Lorem ipsum dolor sit amet, consectetur adipiscing elit. lorem paragraph ${i + 1}.\n`
    + `Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n`
).join('\n');

async function openScriptEditor(page: Page) {
  await selectRequestPaneTab(page, 'Script');

  await page.getByTestId('tab-trigger-pre-request').click();
  await page.getByTestId(EDITOR_ID).waitFor({ state: 'visible' });
}

async function setEditorContent(page: Page, content: string) {
  const cm = page.getByTestId(EDITOR_ID).locator('.CodeMirror').first();
  await cm.waitFor({ state: 'visible' });
  await cm.evaluate((el: any, val: string) => {
    if (el.CodeMirror) el.CodeMirror.setValue(val);
  }, content);
  await page.waitForTimeout(50);
}

async function resetSearchOptions(page: Page) {
  for (const testId of ['search-case-btn', 'search-regex-btn', 'search-wholeword-btn']) {
    const btn = page.getByTestId(EDITOR_ID).getByTestId(testId);
    const cls = await btn.getAttribute('class');
    if (cls?.includes('active')) await btn.click();
  }
}

async function openSearchBar(page: Page) {
  await openScriptEditor(page);
  const cm = page.getByTestId(EDITOR_ID).locator('.CodeMirror').first();
  await cm.evaluate((el: any) => {
    if (el.CodeMirror) {
      el.CodeMirror.setCursor({ line: 0, ch: 0 });
      el.CodeMirror.focus();
    }
  });
  await page.keyboard.press(`${cmdKey}+f`);
  await page.getByTestId(EDITOR_ID).getByTestId('search-bar').waitFor({ state: 'visible' });
  await resetSearchOptions(page);
}

async function closeSearchBar(page: Page) {
  await page.keyboard.press('Escape');
  await page.getByTestId(EDITOR_ID).getByTestId('search-bar').waitFor({ state: 'hidden' });
}

async function expectMatchCount(page: Page, expected: string) {
  await expect(page.getByTestId(EDITOR_ID).getByTestId('match-count')).toHaveText(expected, { timeout: 1500 });
}

test.describe.serial('CodeEditor Search/Replace', () => {
  test.beforeAll(async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('search-replace');
    await createCollection(page, COLLECTION, tmpDir);
    await createRequest(page, REQUEST, COLLECTION);
    await openScriptEditor(page);
    await setEditorContent(page, LARGE_DOC);
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.beforeEach(async ({ page }) => {
    await openScriptEditor(page);
    const searchBar = page.getByTestId(EDITOR_ID).getByTestId('search-bar');
    if (await searchBar.isVisible()) {
      await page.getByTestId(EDITOR_ID).getByTestId('search-close-btn').click();
      await searchBar.waitFor({ state: 'hidden' });
    }
    await setEditorContent(page, LARGE_DOC);
  });

  test('Cmd+F opens the search bar', async ({ page }) => {
    await openSearchBar(page);
    await expect(page.getByTestId(EDITOR_ID).getByTestId('search-bar')).toBeVisible();
    await closeSearchBar(page);
  });

  test('Escape closes the search bar', async ({ page }) => {
    await openSearchBar(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(EDITOR_ID).getByTestId('search-bar')).toBeHidden();
  });

  test('close button closes the search bar', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-close-btn').click();
    await expect(page.getByTestId(EDITOR_ID).getByTestId('search-bar')).toBeHidden();
  });

  test('search input is auto-focused on open', async ({ page }) => {
    await openSearchBar(page);
    await expect(page.getByTestId(EDITOR_ID).getByTestId('search-input')).toBeFocused();
    await closeSearchBar(page);
  });

  test('Cmd+F with text selected pre-fills the search input', async ({ page }) => {
    await openScriptEditor(page);
    const cm = page.getByTestId(EDITOR_ID).locator('.CodeMirror').first();
    await cm.evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.setSelection({ line: 0, ch: 3 }, { line: 0, ch: 10 });
        el.CodeMirror.focus();
      }
    });
    await page.keyboard.press(`${cmdKey}+f`);
    await page.getByTestId(EDITOR_ID).getByTestId('search-bar').waitFor({ state: 'visible' });
    await expect(page.getByTestId(EDITOR_ID).getByTestId('search-input')).toHaveValue('Section');
    await expectMatchCount(page, '1 / 200');
    await closeSearchBar(page);
  });

  test('typing finds all matches in the document', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('lorem');
    await expect(page.getByTestId(EDITOR_ID).getByTestId('match-count')).toContainText('/ 400', { timeout: 1500 });
    await closeSearchBar(page);
  });

  test('unknown term shows 0 results', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('xyznothere');
    await expect(page.getByTestId(EDITOR_ID).getByTestId('match-count')).toHaveText('0 results', { timeout: 1500 });
    await closeSearchBar(page);
  });

  test('clearing the search input resets match count', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('lorem');
    await expectMatchCount(page, '1 / 400');
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('');
    await expect(page.getByTestId(EDITOR_ID).getByTestId('match-count')).toHaveText('0 results', { timeout: 1500 });
    await closeSearchBar(page);
  });

  test('Enter navigates to next match', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('Section');
    await expectMatchCount(page, '1 / 200');
    await page.keyboard.press('Enter');
    await expectMatchCount(page, '2 / 200');
    await page.keyboard.press('Enter');
    await expectMatchCount(page, '3 / 200');
    await closeSearchBar(page);
  });

  test('Shift+Enter goes to previous match and wraps from 1 to last', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('Section');
    await expectMatchCount(page, '1 / 200');
    await page.keyboard.press('Shift+Enter');
    await expectMatchCount(page, '200 / 200');
    await closeSearchBar(page);
  });

  test('Next/Prev buttons wrap around', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('lorem');
    await expectMatchCount(page, '1 / 400');

    await page.getByTestId(EDITOR_ID).getByTestId('search-prev-btn').click();
    await expectMatchCount(page, '400 / 400');

    await page.getByTestId(EDITOR_ID).getByTestId('search-next-btn').click();
    await expectMatchCount(page, '1 / 400');

    await closeSearchBar(page);
  });

  test('search anchors to cursor position when opened mid-document', async ({ page }) => {
    await openScriptEditor(page);

    const cm = page.getByTestId(EDITOR_ID).locator('.CodeMirror').first();
    await cm.evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.setCursor({ line: 500, ch: 0 });
        el.CodeMirror.focus();
      }
    });

    await page.keyboard.press(`${cmdKey}+f`);
    await page.getByTestId(EDITOR_ID).getByTestId('search-bar').waitFor({ state: 'visible' });

    await cm.evaluate((el: any) => {
      if (el.CodeMirror) el.CodeMirror.setCursor({ line: 500, ch: 0 });
    });

    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('Section');
    await expectMatchCount(page, '101 / 200');

    await closeSearchBar(page);
  });

  test('reopening restores previous search text and resumes from cursor at close', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('Section');
    await expectMatchCount(page, '1 / 200');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expectMatchCount(page, '3 / 200');
    await closeSearchBar(page);

    await page.keyboard.press(`${cmdKey}+f`);
    await page.getByTestId(EDITOR_ID).getByTestId('search-bar').waitFor({ state: 'visible' });

    // Text is preserved; match resumes from Section 3 where the cursor was left
    await expect(page.getByTestId(EDITOR_ID).getByTestId('search-input')).toHaveValue('Section');
    await expectMatchCount(page, '3 / 200');

    await closeSearchBar(page);
  });

  test('reopening after moving cursor starts from the new cursor position', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('Section');
    await expectMatchCount(page, '1 / 200');
    await closeSearchBar(page);

    // Simulate scroll + click somewhere else in the document, cursor moves to Section 101 (line 500)
    const cm = page.getByTestId(EDITOR_ID).locator('.CodeMirror').first();
    await cm.evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.setCursor({ line: 500, ch: 0 });
        el.CodeMirror.focus();
      }
    });

    await page.keyboard.press(`${cmdKey}+f`);
    await page.getByTestId(EDITOR_ID).getByTestId('search-bar').waitFor({ state: 'visible' });

    await expectMatchCount(page, '101 / 200');

    await closeSearchBar(page);
  });

  test('reopening the search bar does not scroll away from the current viewport', async ({ page }) => {
    // Search, navigate to a match, then close — leaving the match text selected in the editor
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('Section');
    await expectMatchCount(page, '1 / 200');
    await closeSearchBar(page);

    // Scroll to the middle of the document without moving the cursor
    const cm = page.getByTestId(EDITOR_ID).locator('.CodeMirror').first();
    await cm.evaluate((el: any) => {
      if (el.CodeMirror) {
        el.CodeMirror.scrollTo(null, el.CodeMirror.heightAtLine(500, 'local'));
      }
    });

    const scrollBefore = await cm.evaluate((el: any) => el.CodeMirror?.getScrollInfo().top ?? 0);

    // Reopen — previously this would re-detect the selected match text and scroll back to it
    await page.keyboard.press(`${cmdKey}+f`);
    await page.getByTestId(EDITOR_ID).getByTestId('search-bar').waitFor({ state: 'visible' });

    const scrollAfter = await cm.evaluate((el: any) => el.CodeMirror?.getScrollInfo().top ?? 0);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);

    await closeSearchBar(page);
  });

  test('case-sensitive toggle halves matches for mixed-case term', async ({ page }) => {
    await openSearchBar(page);
    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('lorem');
    await expectMatchCount(page, '1 / 400');

    await page.getByTestId(EDITOR_ID).getByTestId('search-case-btn').click();
    await expectMatchCount(page, '1 / 200');

    await page.getByTestId(EDITOR_ID).getByTestId('search-case-btn').click();
    await expectMatchCount(page, '1 / 400');

    await closeSearchBar(page);
  });

  test('replace single replaces current match and advances to next', async ({ page }) => {
    await openScriptEditor(page);
    await setEditorContent(page, 'foo bar foo baz foo');
    await openSearchBar(page);

    await page.getByTestId(EDITOR_ID).getByTestId('toggle-replace-btn').click();

    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('foo');
    await expectMatchCount(page, '1 / 3');

    await page.getByTestId(EDITOR_ID).getByTestId('replace-input').fill('qux');
    await page.getByTestId(EDITOR_ID).getByTestId('replace-btn').click();

    await expectMatchCount(page, '1 / 2');

    await closeSearchBar(page);
  });

  test('replace all replaces every match', async ({ page }) => {
    await openScriptEditor(page);
    await setEditorContent(page, 'foo bar foo baz foo');
    await openSearchBar(page);

    await page.getByTestId(EDITOR_ID).getByTestId('toggle-replace-btn').click();

    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('foo');
    await expectMatchCount(page, '1 / 3');

    await page.getByTestId(EDITOR_ID).getByTestId('replace-input').fill('qux');
    await page.getByTestId(EDITOR_ID).getByTestId('replace-all-btn').click();

    await expect(page.getByTestId(EDITOR_ID).getByTestId('match-count')).toHaveText('0 results', { timeout: 1500 });

    await closeSearchBar(page);

    await setEditorContent(page, LARGE_DOC);
  });

  test('match count updates when the document is edited while search is open', async ({ page }) => {
    await openScriptEditor(page);
    await setEditorContent(page, 'foo bar baz');
    await openSearchBar(page);

    await page.getByTestId(EDITOR_ID).getByTestId('search-input').fill('foo');
    await expectMatchCount(page, '1 / 1');

    const cm = page.getByTestId(EDITOR_ID).locator('.CodeMirror').first();
    await cm.evaluate((el: any) => {
      if (el.CodeMirror) {
        const lastLine = el.CodeMirror.lastLine();
        const lastCh = el.CodeMirror.getLine(lastLine).length;
        el.CodeMirror.replaceRange(' foo', { line: lastLine, ch: lastCh });
      }
    });

    await expectMatchCount(page, '1 / 2');

    await closeSearchBar(page);
    await setEditorContent(page, LARGE_DOC);
  });
});
