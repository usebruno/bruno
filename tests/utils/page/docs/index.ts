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
  editToggle: () => page.locator('.docs-edit-toggle'),
  modeSwitchDocs: () => page.locator('.docs-mode-switch button').filter({ hasText: 'Rich Text' }),
  modeSwitchMarkdown: () => page.locator('.docs-mode-switch button').filter({ hasText: 'Markdown' }),
  tooltip: (text: string) => page.locator('.react-tooltip').filter({ hasText: text }),
  codeEditor: () => page.locator('.editor-container .CodeMirror-scroll'),
  tableMenuTrigger: () => page.getByTestId('toolbar-table-menu'),
  overflowMenuTrigger: () => page.getByTestId('toolbar-overflow-menu'),
  collectionDocsEditToggle: () => page.locator('.collection-settings-content .editing-mode'),
  collectionDocsSaveBtn: () => page.locator('.collection-settings-content').getByRole('button', { name: 'Save', exact: true }),
  collectionDocsCancelBtn: () => page.locator('.collection-settings-content').getByRole('button', { name: 'Cancel', exact: true }),
  folderDocsEditToggle: () => page.locator('.folder-settings-content .editing-mode'),
  folderDocsSaveBtn: () => page.locator('.folder-settings-content').getByRole('button', { name: 'Save', exact: true }),
  // Code block locators
  codeBlockPre: () => page.getByTestId('code-block-pre'),
  codeBlockLangSelector: () => page.getByTestId('code-block-lang-selector'),
  codeBlockLangOption: (language: string) => page.getByTestId('code-block-lang-option').filter({ hasAttribute: 'data-language', hasText: language }).or(page.getByTestId('code-block-lang-option').filter({ hasAttribute: 'data-language', has: page.locator(`[data-language="${language}"]`) })),
  codeBlockCopyBtn: () => page.getByTestId('code-block-copy-btn'),
  codeBlockContent: () => page.locator('[data-testid="code-block-pre"] code'),
  codeBlockSyntaxHighlight: (className: string) => page.locator(`[data-testid="code-block-pre"] code .${className}`)
});
