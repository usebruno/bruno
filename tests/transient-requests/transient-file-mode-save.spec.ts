import { expect, Page, test } from '../../playwright';
import { closeAllCollections, createCollection, createTransientRequest } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

type CollectionFormat = 'bru' | 'yml';

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
const closeTabShortcut = process.platform === 'darwin' ? 'Meta+w' : 'Control+w';
const findShortcut = process.platform === 'darwin' ? 'Meta+f' : 'Control+f';

const switchToFileMode = async (page: Page) => {
  await page.getByTestId('view-mode-file').click();
  await expect(page.locator('.file-mode .CodeMirror')).toBeVisible();
};

const setUrlInFileModeRaw = async (page: Page, newUrl: string) => {
  const fileEditor = page.locator('.file-mode .CodeMirror');
  await fileEditor.click();
  await fileEditor.evaluate((el: any, url: string) => {
    const cm = el.CodeMirror;
    cm.setValue(cm.getValue().replace(/url:.*/, `url: ${url}`));
  }, newUrl);
};

const saveTransientViaModal = async (page: Page, requestName: string) => {
  const saveModal = page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' });
  await expect(saveModal).toBeVisible({ timeout: 5000 });
  const requestNameInput = saveModal.locator('#request-name');
  await requestNameInput.clear();
  await requestNameInput.fill(requestName);
  await saveModal.getByRole('button', { name: 'Save' }).click();
};

const expectFileModeRawContainsUrl = async (page: Page, url: string) => {
  await expect
    .poll(async () => page.locator('.file-mode .CodeMirror .CodeMirror-code').textContent(), { timeout: 5000 })
    .toContain(url);
};

// Deterministic content with known searchable tokens (`meta`, `settings`).
const SEARCH_CONTENT = [
  'meta {',
  '  name: Search Sample',
  '  type: http',
  '  seq: 1',
  '}',
  '',
  'get {',
  '  url: http://localhost:8081/search',
  '}',
  '',
  'settings {',
  '  encodeUrl: true',
  '}'
].join('\n');

const setFileModeRaw = async (page: Page, content: string) => {
  const fileEditor = page.locator('.file-mode .CodeMirror');
  await fileEditor.click();
  await fileEditor.evaluate((el: any, value: string) => {
    el.CodeMirror.setValue(value);
  }, content);
};

const searchInFileMode = async (page: Page, term: string) => {
  await page.locator('.file-mode .CodeMirror').click();
  await page.keyboard.press(findShortcut);
  const searchBar = page.locator('.bruno-search-bar');
  await expect(searchBar).toBeVisible();
  await searchBar.locator('input').fill(term);
  // The current match is highlighted in the editor and the count is non-zero.
  await expect(page.locator('.file-mode .CodeMirror .cm-search-current').first()).toBeVisible();
  await expect(searchBar.locator('.searchbar-result-count')).not.toHaveText('0 results');
};

const closeFileModeSearch = async (page: Page) => {
  await page.locator('.bruno-search-bar input').press('Escape');
  await expect(page.locator('.bruno-search-bar')).toBeHidden();
};

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
        await expect(page.locator('.request-tab.active .has-changes-icon')).toBeVisible();
      });

      await test.step('Save via shortcut and confirm the transient modal', async () => {
        await page.keyboard.press(saveShortcut);
        await saveTransientViaModal(page, 'Saved From File Mode');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From File Mode')).toBeVisible({ timeout: 5000 });
        await expectFileModeRawContainsUrl(page, editedUrl);
      });
    });

    test('Close -> Save & Close (✕) -> preserves file-mode edits', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/file-mode-close-x';

      await test.step('Create transient request and edit raw URL in file mode', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        await switchToFileMode(page);
        await setUrlInFileModeRaw(page, editedUrl);
        await expect(page.locator('.request-tab.active .has-changes-icon')).toBeVisible();
      });

      await test.step('Close via (✕) -> prompt -> Save & Close', async () => {
        await page.locator('.request-tab.active').getByTestId('request-tab-close-icon').click({ force: true });
        const unsavedModal = page.locator('.bruno-modal-card').filter({ hasText: 'Unsaved changes' });
        await expect(unsavedModal).toBeVisible({ timeout: 5000 });
        await unsavedModal.getByRole('button', { name: 'Save', exact: true }).click();
        await saveTransientViaModal(page, 'Saved From Close X');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From Close X')).toBeVisible({ timeout: 5000 });
        await expectFileModeRawContainsUrl(page, editedUrl);
      });
    });

    test('Close -> Save & Close (closeTab shortcut) preserves file-mode edits', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/file-mode-close-shortcut';

      await test.step('Create transient request and edit raw URL in file mode', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        await switchToFileMode(page);
        await setUrlInFileModeRaw(page, editedUrl);
        await expect(page.locator('.request-tab.active .has-changes-icon')).toBeVisible();
      });

      await test.step('Close via closeTab shortcut -> prompt -> Save & Close', async () => {
        await page.keyboard.press(closeTabShortcut);
        const unsavedModal = page.locator('.bruno-modal-card').filter({ hasText: 'Unsaved changes' });
        await expect(unsavedModal).toBeVisible({ timeout: 5000 });
        await unsavedModal.getByRole('button', { name: 'Save', exact: true }).click();
        await saveTransientViaModal(page, 'Saved From Close Shortcut');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From Close Shortcut')).toBeVisible({ timeout: 5000 });
        await expectFileModeRawContainsUrl(page, editedUrl);
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
        await page.locator('.file-mode .CodeMirror').click();
        await page.keyboard.press(saveShortcut);
        await saveTransientViaModal(page, 'Saved From Editor Shortcut');
      });

      await test.step('Saved request keeps the file-mode edit', async () => {
        await expect(locators.sidebar.request('Saved From Editor Shortcut')).toBeVisible({ timeout: 5000 });
        await expectFileModeRawContainsUrl(page, editedUrl);
      });
    });

    test('Code-mode transient save preserves code-mode edits', async ({ page }) => {
      const editedUrl = 'http://localhost:8081/code-mode-save';

      await test.step('Create transient request and edit URL in CODE mode', async () => {
        await createTransientRequest(page, { requestType: 'HTTP' });
        const urlEditor = page.locator('#request-url .CodeMirror');
        await urlEditor.click();
        await page.keyboard.type(editedUrl);
      });

      await test.step('Save via shortcut and confirm the transient modal', async () => {
        await page.keyboard.press(saveShortcut);
        await saveTransientViaModal(page, 'Saved From Code Mode');
      });

      await test.step('Saved request keeps the code-mode edit (regression guard)', async () => {
        await expect(locators.sidebar.request('Saved From Code Mode')).toBeVisible({ timeout: 5000 });
        await locators.sidebar.request('Saved From Code Mode').click();
        await expect
          .poll(async () => page.locator('#request-url .CodeMirror').textContent(), { timeout: 5000 })
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
      });

      await test.step('Come out of the search box', async () => {
        await closeFileModeSearch(page);
      });

      await test.step('Re-open search and query "settings" -> matches are highlighted', async () => {
        await searchInFileMode(page, 'settings');
      });
    });
  });
};

defineFileModeSaveSuite('bru');
defineFileModeSaveSuite('yml');
