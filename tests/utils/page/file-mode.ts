import process from 'node:process';
import { expect, Locator, Page } from '../../../playwright';

const findShortcut = process.platform === 'darwin' ? 'Meta+f' : 'Control+f';

export const fileModeEditor = (page: Page): Locator => page.locator('.file-mode .CodeMirror');

export const switchToFileMode = async (page: Page) => {
  await page.getByTestId('view-mode-file').click();
  await expect(fileModeEditor(page)).toBeVisible();
};

export const setUrlInFileModeRaw = async (page: Page, newUrl: string) => {
  const fileEditor = fileModeEditor(page);
  await fileEditor.click();
  await fileEditor.evaluate((el: any, url: string) => {
    const cm = el.CodeMirror;
    cm.setValue(cm.getValue().replace(/url:.*/, `url: ${url}`));
  }, newUrl);
};

export const saveTransientViaModal = async (page: Page, requestName: string) => {
  const saveModal = page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' });
  await expect(saveModal).toBeVisible({ timeout: 5000 });
  const requestNameInput = saveModal.locator('#request-name');
  await requestNameInput.clear();
  await requestNameInput.fill(requestName);
  await saveModal.getByRole('button', { name: 'Save' }).click();
};

export const expectFileModeRawContainsUrl = async (page: Page, url: string) => {
  await expect
    .poll(async () => fileModeEditor(page).locator('.CodeMirror-code').textContent(), { timeout: 5000 })
    .toContain(url);
};

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

export const setFileModeRaw = async (page: Page, content: string) => {
  const fileEditor = fileModeEditor(page);
  await fileEditor.click();
  await fileEditor.evaluate((el: any, value: string) => {
    el.CodeMirror.setValue(value);
  }, content);
};

export const searchInFileMode = async (page: Page, term: string) => {
  await fileModeEditor(page).click();
  await page.keyboard.press(findShortcut);
  const searchBar = page.locator('.bruno-search-bar');
  await expect(searchBar).toBeVisible();
  await searchBar.locator('input').fill(term);
  await expect(fileModeEditor(page).locator('.cm-search-current').first()).toBeVisible();
  await expect(searchBar.locator('.searchbar-result-count')).not.toHaveText('0 results');
};

export const closeFileModeSearch = async (page: Page) => {
  await page.locator('.bruno-search-bar input').press('Escape');
  await expect(page.locator('.bruno-search-bar')).toBeHidden();
};
