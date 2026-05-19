import { Page, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { selectRequestPaneTab } from '../../utils/page/actions';

/**
 * Open the generate-code dialog for the currently-selected request and return
 * the snippet text from the first CodeMirror editor in the dialog.
 *
 * Default language is whatever Bruno preselects (shell/curl), matching
 * tests/request/encoding/curl-encoding.spec.ts.
 */
export const getGeneratedSnippet = async (page: Page): Promise<string> => {
  const { request } = buildCommonLocators(page);

  await request.generateCodeButton().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const codeEditor = page.locator('.editor-content .CodeMirror').first();
  await expect(codeEditor).toBeVisible();

  return (await codeEditor.textContent()) ?? '';
};

/**
 * Close the generate-code dialog. Idempotent w.r.t. the visibility check —
 * the caller should always pair this with getGeneratedSnippet to keep tests
 * isolated.
 */
export const closeGenerateCodeDialog = async (page: Page) => {
  const { modal } = buildCommonLocators(page);
  await modal.closeButton().click();
  await modal.closeButton().waitFor({ state: 'hidden' });
};

/**
 * Click the folder, then click a request inside it. The folder is expanded
 * lazily — clicking its row toggles expansion in the sidebar.
 *
 * Uses an **exact-name** match on the inner `.item-name` span (not the
 * default `hasText` substring on `.collection-item-name` row). The default
 * locator's substring match collides on prefix-overlapping names like
 * `path-odata` vs `params-path-odata`.
 */
export const openRequestInFolder = async (page: Page, folderName: string, requestName: string) => {
  const { sidebar } = buildCommonLocators(page);
  await sidebar.folder(folderName).click();

  const folderWrapper = page.locator('.collection-item-name').filter({ hasText: folderName }).locator('..');
  const escapedName = requestName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const requestRow = folderWrapper.locator('.collection-item-name').filter({
    has: page.locator('.item-name').filter({ hasText: new RegExp(`^${escapedName}$`) })
  });
  await requestRow.click();
};

/**
 * Set the request's "URL Encoding" toggle (Settings tab) to the desired
 * state. Idempotent — reads `aria-checked` first and only clicks when the
 * current state differs.
 *
 * Lets both specs share the same set of `encodeUrl: false` fixtures: the
 * ON spec calls `setUrlEncoding(page, true)` before generating code; the
 * OFF spec calls `setUrlEncoding(page, false)` (a safety no-op for fresh
 * fixtures, defensive against any state carried from a previous test).
 */
export const setUrlEncoding = async (page: Page, enabled: boolean) => {
  await selectRequestPaneTab(page, 'Settings');
  const toggle = page.getByTestId('encode-url-toggle');
  await expect(toggle).toBeVisible();
  const current = (await toggle.getAttribute('aria-checked')) === 'true';
  if (current !== enabled) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
  }
};
