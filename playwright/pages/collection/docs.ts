import { test, expect, Page } from '../..';
import { buildItemActionLocators } from '../sidebar/item-actions';
import { buildSidebarLocators } from '../sidebar/collection-tree';
import { waitForCollectionMount } from './mount';

/**
 * Locators for the request/collection/folder documentation (rich-text docs editor) section.
 */
export const buildDocsLocators = (page: Page) => ({
  docsTab: () => page.getByTestId('responsive-tab-docs'),
  moreTabs: () => page.locator('.more-tabs'),
  proseMirror: () => page.locator('.ProseMirror'),
  toolbarBtn: (label: string) => page.locator(`.toolbar-btn[aria-label="${label}"]`),
  headingDropdown: () => page.locator('button.heading-dropdown-trigger'),
  editToggle: () => page.getByTestId('docs-edit-toggle'),
  modeSwitchDocs: () => page.locator('.docs-mode-switch button').filter({ hasText: 'Rich Text' }),
  modeSwitchMarkdown: () => page.locator('.docs-mode-switch button').filter({ hasText: 'Markdown' }),
  tooltip: (text: string) => page.locator('.react-tooltip').filter({ hasText: text }),
  codeEditor: () => page.locator('.editor-container .CodeMirror-scroll'),
  tableMenuTrigger: () => page.getByTestId('toolbar-table-menu'),
  overflowMenuTrigger: () => page.getByTestId('toolbar-overflow-menu'),
  collectionDocsEditToggle: () => page.getByTestId('settings-tab-bar').getByTestId('docs-edit-toggle'),
  collectionDocsSaveBtn: () => page.locator('.collection-settings-content').getByRole('button', { name: 'Save', exact: true }),
  collectionDocsCancelBtn: () => page.locator('.collection-settings-content').getByRole('button', { name: 'Cancel', exact: true }),
  folderDocsEditToggle: () => page.getByTestId('settings-tab-bar').getByTestId('docs-edit-toggle'),
  folderDocsSaveBtn: () => page.locator('.folder-settings-content').getByRole('button', { name: 'Save', exact: true }),
  // Code block locators
  codeBlockPre: () => page.getByTestId('code-block-pre'),
  codeBlockLangSelector: () => page.getByTestId('code-block-lang-selector'),
  codeBlockLangOption: (language: string) => page.locator(`[role="menuitem"][data-item-id="${language}"]`),
  codeBlockCopyBtn: () => page.getByTestId('code-block-copy-btn'),
  codeBlockContent: () => page.locator('[data-testid="code-block-pre"] code'),
  codeBlockSyntaxHighlight: (className: string) => page.locator(`[data-testid="code-block-pre"] code .${className}`),
  // Link popover locators
  linkEditPopover: () => page.locator('[data-editor-link-popover="true"]'),
  linkEditUrlInput: () => page.getByRole('textbox', { name: 'URL' }),
  linkEditInsertBtn: () => page.locator('[data-editor-link-popover="true"]').getByRole('button', { name: 'Insert' }),
  linkEditSaveBtn: () => page.locator('[data-editor-link-popover="true"]').getByRole('button', { name: 'Save' }),
  linkHoverPopover: () => page.locator('[data-hover-popover="true"]'),
  linkHoverUrlDisplay: () => page.locator('[data-hover-popover="true"] .link-url'),
  linkHoverEditBtn: () => page.getByTestId('link-hover-edit-btn'),
  linkHoverUnlinkBtn: () => page.getByTestId('link-hover-unlink-btn')
});

/**
 * Locators for the Generate Documentation modal.
 */
export const buildGenerateDocsLocators = (page: Page) => ({
  menuItem: () => page.locator('.dropdown-item').filter({ hasText: 'Generate Docs' }),
  modal: () => page.locator('.bruno-modal').filter({
    has: page.locator('.bruno-modal-header-title').filter({ hasText: 'Generate Documentation' })
  }),
  heading: () => page.locator('.bruno-modal').getByText('Interactive API Documentation'),
  generateButton: () => page.locator('.bruno-modal').getByRole('button', { name: 'Generate', exact: true }),
  cancelButton: () => page.locator('.bruno-modal').getByRole('button', { name: 'Cancel', exact: true }),
  // Collection name + version (read-only) display
  versionInfo: () => page.locator('.bruno-modal').getByTestId('version-info'),
  collectionName: () => page.locator('.bruno-modal').getByTestId('collection-name'),
  versionValue: () => page.locator('.bruno-modal').getByTestId('version-value'),
  versionCounts: () => page.locator('.bruno-modal').getByTestId('version-summary'),
  // Environment selection list
  environmentsTitle: () => page.locator('.bruno-modal').getByTestId('env-section-title'),
  // Header controls: tri-state "select all" checkbox + "X/Y selected" count
  selectAllCheckbox: () => page.locator('.bruno-modal').getByTestId('env-select-all'),
  selectAllLabel: () => page.locator('.bruno-modal').getByTestId('env-select-all-label'),
  selectedCount: () => page.locator('.bruno-modal').getByTestId('env-selected-count'),
  environmentRows: () => page.locator('.bruno-modal').getByTestId('env-row'),
  environmentRow: (name: string) =>
    page.locator('.bruno-modal').getByTestId('env-row').filter({ has: page.getByText(name, { exact: true }) }),
  // A row has exactly one checkbox; its data-testid is uid-keyed, so select it by role within the named row.
  environmentCheckbox: (name: string) =>
    page
      .locator('.bruno-modal')
      .getByTestId('env-row')
      .filter({ has: page.getByText(name, { exact: true }) })
      .getByRole('checkbox'),
  advancedToggle: () => page.locator('.bruno-modal').getByTestId('docs-advanced-toggle'),
  allRequestsRadio: () => page.locator('.bruno-modal').getByTestId('docs-requests-all'),
  filterByTagsRadio: () => page.locator('.bruno-modal').getByTestId('docs-requests-filter'),
  tooltip: (text: string) => page.locator('.react-tooltip').filter({ hasText: text }),
  includeTagsInput: () => page.locator('.bruno-modal').getByLabel('Include Tags'),
  excludeTagsInput: () => page.locator('.bruno-modal').getByLabel('Exclude Tags'),
  tagChip: (name: string) => page.locator('.bruno-modal').getByTestId('tag-picker-item').filter({ hasText: name }),
  gitLinkLabel: () => page.locator('.bruno-modal').getByTestId('docs-git-link')
});

const buildLocators = (page: Page) => ({
  actions: buildItemActionLocators(page),
  generateDocs: buildGenerateDocsLocators(page),
  sidebar: buildSidebarLocators(page)
});

/**
 * Trigger "Generate Docs" from a collection's sidebar context menu and capture
 * the generated HTML documentation.
 *
 * The GenerateDocumentation modal hands the file to `FileSaver.saveAs`, which
 * builds an in-memory Blob and saves it via an `<a download>` click rather than
 * an Electron IPC write. Electron doesn't surface that as a Playwright
 * `download` event, so instead we intercept it in the renderer: `URL.createObjectURL`
 * gives us the Blob's content, and overriding the anchor click captures the
 * suggested file name while suppressing the real save (no file leaks to disk).
 *
 * @param page - The page object
 * @param collectionName - The name of the collection to generate docs for
 * @returns The generated HTML content and the download's suggested file name
 */
export const generateCollectionDocs = async (
  page: Page,
  collectionName: string,
  beforeGenerate?: () => Promise<void>
): Promise<{ content: string; fileName: string }> => {
  return await test.step(`Generate docs for collection "${collectionName}"`, async () => {
    const locators = buildLocators(page);

    // Make sure the collection has finished mounting before interacting — on a
    // cold start the row (and its hover-revealed actions icon) isn't ready yet,
    // so this keeps the helper self-sufficient for any caller.
    await waitForCollectionMount(page, collectionName);

    // Open the collection's context menu and click "Generate Docs"
    await locators.sidebar.collection(collectionName).hover();
    const collectionAction = locators.actions.collectionActions(collectionName);
    await expect(collectionAction).toBeVisible({ timeout: 2000 });
    await collectionAction.click();
    await locators.generateDocs.menuItem().click();

    // Wait for the Generate Documentation modal to reach its ready (non-loading)
    // state — the confirm button reads "Loading..." while the collection's items
    // are still mounting and only becomes "Generate" once they are ready.
    const modal = locators.generateDocs.modal();
    await expect(modal).toBeVisible({ timeout: 5000 });
    const generateButton = locators.generateDocs.generateButton();
    await expect(generateButton).toBeEnabled({ timeout: 10000 });

    // Let the caller interact with the modal (e.g. toggle environment selection)
    // after it is ready and before the docs are generated.
    if (beforeGenerate) {
      await beforeGenerate();
    }

    // Arm the renderer-side interception before the save fires. `file-saver`
    // (v2) reads the Blob through `URL.createObjectURL` and then triggers the
    // save by dispatching a synthetic click on a detached `<a download>` (via
    // `setTimeout(…, 0)`), so both points are intercepted. Each is exposed as a
    // promise to absorb that deferred dispatch without a race.
    await page.evaluate(() => {
      const w = window as any;
      const originalCreate = URL.createObjectURL.bind(URL);
      const originalDispatch = HTMLAnchorElement.prototype.dispatchEvent;

      w.__docsContent = new Promise<string>((resolve) => {
        URL.createObjectURL = function (obj: Blob | MediaSource) {
          if (obj instanceof Blob) {
            obj.text().then(resolve);
          }
          return originalCreate(obj as Blob);
        };
      });

      w.__docsFileName = new Promise<string>((resolve) => {
        HTMLAnchorElement.prototype.dispatchEvent = function (this: HTMLAnchorElement, event: Event) {
          if (this.download && event && event.type === 'click') {
            resolve(this.download);
            // Suppress the actual save — the Blob content is already captured.
            return true;
          }
          return originalDispatch.call(this, event);
        };
      });
    });

    await generateButton.click();

    const content = await page.evaluate(() => (window as any).__docsContent as Promise<string>);
    const fileName = await page.evaluate(() => (window as any).__docsFileName as Promise<string>);

    // The modal closes itself on the success path.
    await expect(modal).toBeHidden({ timeout: 5000 });

    return { content, fileName };
  });
};
