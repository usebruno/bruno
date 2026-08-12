import { Page } from '../../../playwright';

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
