import process from 'node:process';
import { Page, test } from '../../../playwright';

const findShortcut = process.platform === 'darwin' ? 'Meta+f' : 'Control+f';

export const buildFileModeLocators = (page: Page) => ({
  editor: () => page.locator('.file-mode .CodeMirror'),
  editorContent: () => page.locator('.file-mode .CodeMirror .CodeMirror-code'),
  currentSearchMatch: () => page.locator('.file-mode .CodeMirror .cm-search-current'),
  search: {
    bar: () => page.locator('.bruno-search-bar'),
    input: () => page.locator('.bruno-search-bar input'),
    resultCount: () => page.locator('.bruno-search-bar .searchbar-result-count')
  },
  transientSaveModal: {
    card: () => page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' }),
    nameInput: () => page.locator('.bruno-modal-card #request-name'),
    saveButton: () =>
      page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' }).getByRole('button', { name: 'Save' })
  }
});

// Deterministic content with known searchable tokens (`meta`, `settings`).
export const SEARCH_CONTENT = [
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

// Switch the active request into File Mode via the header view-mode toggle.
export const switchToFileMode = async (page: Page) => {
  await test.step('Switch to File Mode', async () => {
    const fileMode = buildFileModeLocators(page);
    await page.getByTestId('view-mode-file').click();
    await fileMode.editor().waitFor({ state: 'visible' });
  });
};

// Edit the raw request content in file mode via the CodeMirror API — sets the
// `url:` line. Works for both .bru and .yml since both use a `url:` key.
export const setUrlInFileModeRaw = async (page: Page, newUrl: string) => {
  await test.step(`Set file-mode URL to ${newUrl}`, async () => {
    const editor = buildFileModeLocators(page).editor();
    await editor.click();
    await editor.evaluate((el: any, url: string) => {
      const cm = el.CodeMirror;
      cm.setValue(cm.getValue().replace(/url:.*/, `url: ${url}`));
    }, newUrl);
  });
};

// Replace the entire raw content of the file-mode editor.
export const setFileModeRaw = async (page: Page, content: string) => {
  await test.step('Set file-mode raw content', async () => {
    const editor = buildFileModeLocators(page).editor();
    await editor.click();
    await editor.evaluate((el: any, value: string) => {
      el.CodeMirror.setValue(value);
    }, content);
  });
};

// Fill and submit the transient "Save Request" modal.
export const saveTransientViaModal = async (page: Page, requestName: string) => {
  await test.step(`Save transient request as "${requestName}"`, async () => {
    const { transientSaveModal } = buildFileModeLocators(page);
    await transientSaveModal.card().waitFor({ state: 'visible' });
    await transientSaveModal.nameInput().fill(requestName);
    await transientSaveModal.saveButton().click();
  });
};

// Open the in-editor search (Cmd/Ctrl-F) and enter a search term.
export const searchInFileMode = async (page: Page, term: string) => {
  await test.step(`Search "${term}" in file mode`, async () => {
    const fileMode = buildFileModeLocators(page);
    await fileMode.editor().click();
    await page.keyboard.press(findShortcut);
    await fileMode.search.bar().waitFor({ state: 'visible' });
    await fileMode.search.input().fill(term);
  });
};

// Close the in-editor search box via Escape.
export const closeFileModeSearch = async (page: Page) => {
  await test.step('Close file-mode search', async () => {
    const fileMode = buildFileModeLocators(page);
    await fileMode.search.input().press('Escape');
    await fileMode.search.bar().waitFor({ state: 'hidden' });
  });
};
