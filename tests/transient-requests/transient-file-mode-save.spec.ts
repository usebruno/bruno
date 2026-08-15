import { expect, test } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeFileModeSearch,
  createCollection,
  createTransientRequest,
  fillRequestUrl,
  saveTransientViaModal,
  SEARCH_CONTENT,
  searchInFileMode,
  setFileModeRaw,
  setUrlInFileModeRaw,
  switchToFileMode
} from '../utils/page';

type CollectionFormat = 'bru' | 'yml';

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
const closeTabShortcut = process.platform === 'darwin' ? 'Meta+w' : 'Control+w';

const defineFileModeSaveSuite = (format: CollectionFormat) => {
  test.describe(`Transient + File Mode save (${format})`, () => {
    let locators: ReturnType<typeof buildCommonLocators>;
    const collectionName = `transient-file-mode-${format}`;

    test.beforeEach(async ({ page, createTmpDir }) => {
      locators = buildCommonLocators(page);
      await createCollection(page, collectionName, await createTmpDir(collectionName), format);
      await expect(locators.sidebar.collection(collectionName)).toBeVisible();
      await locators.sidebar.collection(collectionName).click();
    });

    test.afterEach(async ({ page }) => {
      if (!page.isClosed()) {
        await closeAllCollections(page);
      }
    });

    test('Save button preserves file-mode edits', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/file-mode-save';

      await test.step('Create transient HTTP request', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
      });

      await test.step('Switch to file mode and edit the raw URL', async () => {
        await switchToFileMode(page);
        await setUrlInFileModeRaw(page, editedUrl);
        await expect(locators.tabs.draftIndicator()).toBeVisible();
      });

      await test.step('Save via shortcut and confirm the transient modal', async () => {
        await page.keyboard.press(saveShortcut);
        await saveTransientViaModal(page, 'Saved From File Mode');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From File Mode')).toBeVisible({ timeout: 10000 });
        await expect
          .poll(async () => locators.fileMode.editorContent().textContent(), { timeout: 10000 })
          .toContain(editedUrl);
      });
    });

    test('Close -> Save & Close (✕) -> preserves file-mode edits', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/file-mode-close-x';

      await test.step('Create transient request and edit raw URL in file mode', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        await switchToFileMode(page);
        await setUrlInFileModeRaw(page, editedUrl);
        await expect(locators.tabs.draftIndicator()).toBeVisible();
      });

      await test.step('Close via (✕) -> prompt -> Save & Close', async () => {
        await locators.tabs.closeTab('Untitled').click({ force: true });
        await expect(locators.modal.byTitle('Unsaved changes')).toBeVisible({ timeout: 10000 });
        await locators.modal.button('Save').click();
        await saveTransientViaModal(page, 'Saved From Close X');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From Close X')).toBeVisible({ timeout: 10000 });
        await expect
          .poll(async () => locators.fileMode.editorContent().textContent(), { timeout: 10000 })
          .toContain(editedUrl);
      });
    });

    test('Close -> Save & Close (closeTab shortcut) preserves file-mode edits', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/file-mode-close-shortcut';

      await test.step('Create transient request and edit raw URL in file mode', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        await switchToFileMode(page);
        await setUrlInFileModeRaw(page, editedUrl);
        await expect(locators.tabs.draftIndicator()).toBeVisible();
      });

      await test.step('Close via closeTab shortcut -> prompt -> Save & Close', async () => {
        await page.keyboard.press(closeTabShortcut);
        await expect(locators.modal.byTitle('Unsaved changes')).toBeVisible({ timeout: 10000 });
        await locators.modal.button('Save').click();
        await saveTransientViaModal(page, 'Saved From Close Shortcut');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From Close Shortcut')).toBeVisible({ timeout: 10000 });
        await expect
          .poll(async () => locators.fileMode.editorContent().textContent(), { timeout: 10000 })
          .toContain(editedUrl);
      });
    });

    test('Preferences save shortcut fires from inside the file-mode editor', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/file-mode-editor-save';

      await test.step('Create transient request and edit raw URL in file mode', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        await switchToFileMode(page);
        await setUrlInFileModeRaw(page, editedUrl);
      });

      await test.step('Press save while focused INSIDE the editor -> transient modal opens', async () => {
        await locators.fileMode.editor().click();
        await page.keyboard.press(saveShortcut);
        await saveTransientViaModal(page, 'Saved From Editor Shortcut');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From Editor Shortcut')).toBeVisible({ timeout: 10000 });
        await expect
          .poll(async () => locators.fileMode.editorContent().textContent(), { timeout: 10000 })
          .toContain(editedUrl);
      });
    });

    test('Code-mode transient save preserves code-mode edits', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/code-mode-save';

      await test.step('Create transient request and edit URL in CODE mode', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        await fillRequestUrl(page, editedUrl);
      });

      await test.step('Save via shortcut and confirm the transient modal', async () => {
        await page.keyboard.press(saveShortcut);
        await saveTransientViaModal(page, 'Saved From Code Mode');
      });

      await test.step('Saved request keeps the code-mode edit (regression guard)', async () => {
        // The saved request auto-opens in code mode; verify the URL from the open
        // editor (avoids clicking the churning sidebar tree right after a save).
        await expect(locators.sidebar.request('Saved From Code Mode')).toBeVisible({ timeout: 10000 });
        await expect
          .poll(async () => locators.request.urlInput().textContent(), { timeout: 10000 })
          .toContain(editedUrl);
      });
    });

    test('Cmd-F search highlights matches, closes, then re-searches a new value', async ({ page }) => {
      await test.step('Create transient request, enter file mode, set known content', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        await switchToFileMode(page);
        await setFileModeRaw(page, SEARCH_CONTENT);
      });

      await test.step('Search "meta" -> matches are highlighted', async () => {
        await searchInFileMode(page, 'meta');
        await expect(locators.fileMode.currentSearchMatch().first()).toBeVisible();
        await expect(locators.fileMode.search.resultCount()).not.toHaveText('0 results');
      });

      await test.step('Come out of the search box', async () => {
        await closeFileModeSearch(page);
        await expect(locators.fileMode.search.bar()).toBeHidden();
      });

      await test.step('Re-open search and query "settings" -> matches are highlighted', async () => {
        await searchInFileMode(page, 'settings');
        await expect(locators.fileMode.currentSearchMatch().first()).toBeVisible();
        await expect(locators.fileMode.search.resultCount()).not.toHaveText('0 results');
      });
    });
  });
};

defineFileModeSaveSuite('bru');
defineFileModeSaveSuite('yml');
