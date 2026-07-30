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
  collectionDocsEditToggle: () => page.locator('.collection-settings-content .editing-mode'),
  collectionDocsSaveBtn: () => page.locator('.collection-settings-content').getByRole('button', { name: 'Save', exact: true }),
  collectionDocsCancelBtn: () => page.locator('.collection-settings-content').getByRole('button', { name: 'Cancel', exact: true }),
  folderDocsEditToggle: () => page.locator('.folder-settings-content .editing-mode'),
  folderDocsSaveBtn: () => page.locator('.folder-settings-content').getByRole('button', { name: 'Save', exact: true })
});
