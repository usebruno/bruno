import { Page, test } from '../../../../playwright';

type VariablesView = 'used' | 'all';
type RowAction = 'copy' | 'clear' | 'secret-toggle';

export const buildVariablesSidebarLocators = (page: Page) => {
  const sidebar = () => page.getByTestId('variables-sidebar');
  const table = (sectionKey: string) => sidebar().getByTestId(`variables-sidebar-${sectionKey}-table`);
  const row = (sectionKey: string, name: string) => table(sectionKey).locator(`tbody tr[data-row-name="${name}"]`);
  const folderSection = (folderName: string) => sidebar()
    .getByTestId(/^variables-sidebar-folder:.+-section$/)
    .filter({ has: page.getByTestId('variables-scope-pill').filter({ hasText: folderName }) });

  return {
    sidebar,
    section: (sectionKey: string) => sidebar().getByTestId(`variables-sidebar-${sectionKey}-section`),
    sections: () => sidebar().getByTestId(/^variables-sidebar-.+-section$/),
    sectionCount: (sectionKey: string) => sidebar()
      .getByTestId(`variables-sidebar-${sectionKey}-section`)
      .getByTestId('variables-section-count'),
    folderSection,
    folderRow: (folderName: string, name: string) => folderSection(folderName).locator(`tbody tr[data-row-name="${name}"]`),
    folderRowValue: (folderName: string, name: string) => folderSection(folderName)
      .locator(`tbody tr[data-row-name="${name}"]`)
      .getByTestId('variable-singleline-editor'),
    title: () => sidebar().locator('.header-title'),
    table,
    row,
    rowValue: (sectionKey: string, name: string) => row(sectionKey, name).getByTestId('variable-singleline-editor'),
    rowAction: (sectionKey: string, name: string, action: RowAction) => row(sectionKey, name).getByTestId(`variable-row-${action}`),
    valueEditor: () => sidebar().getByTestId('variables-sidebar-value-editor'),
    defineEditor: (name: string) => row('undefined', name).getByTestId('variables-sidebar-define-editor'),
    viewTab: (view: VariablesView) => sidebar().getByTestId(`responsive-tab-${view}`)
  };
};

/**
 * Open the Variables sidebar from the active tab's "..." menu and show every variable.
 */
export const openVariablesSidebar = async (page: Page) => {
  await test.step('Open the Variables sidebar', async () => {
    const { sidebar, viewTab } = buildVariablesSidebarLocators(page);
    await page.getByTestId('more-actions').click();
    await page.getByTestId('more-actions-variables').click();
    await sidebar().waitFor({ state: 'visible' });
    await viewTab('all').click();
  });
};

export const closeVariablesSidebar = async (page: Page) => {
  await test.step('Close the Variables sidebar', async () => {
    const { sidebar } = buildVariablesSidebarLocators(page);
    await sidebar().getByTestId('variables-sidebar-close').click();
    await sidebar().waitFor({ state: 'detached' });
  });
};

export const selectVariablesView = async (page: Page, view: VariablesView) => {
  await test.step(`Show the "${view}" variables view`, async () => {
    await buildVariablesSidebarLocators(page).viewTab(view).click();
  });
};

/**
 * The section test ids in display order, with each folder's uid replaced by `folder`
 * because folder uids are generated when the collection loads.
 */
export const readSectionOrder = async (page: Page): Promise<string[]> => {
  const testIds = await buildVariablesSidebarLocators(page)
    .sections()
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid') || ''));
  return testIds.map((testId) => testId.replace(/^variables-sidebar-(.+)-section$/, '$1').replace(/^folder:.+$/, 'folder'));
};

/**
 * The text of a value cell. CodeMirror pads an otherwise-empty line with a
 * zero-width space, so strip it before comparing.
 */
export const readVariableValue = async (page: Page, sectionKey: string, name: string): Promise<string> => {
  const lines = await buildVariablesSidebarLocators(page)
    .row(sectionKey, name)
    .locator('.CodeMirror-line')
    .allInnerTexts();
  return lines.join('\n').replace(/​/g, '').trim();
};

/**
 * Click a value to edit it, replace the text, then commit by clicking outside the editor.
 */
export const editVariableValue = async (page: Page, sectionKey: string, name: string, value: string) => {
  await test.step(`Edit "${name}" in the ${sectionKey} section`, async () => {
    const { rowValue, valueEditor, title } = buildVariablesSidebarLocators(page);
    await rowValue(sectionKey, name).click();
    await valueEditor().waitFor({ state: 'visible' });
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(value);
    await title().click();
    await valueEditor().waitFor({ state: 'detached' });
  });
};

/**
 * Type a value for an undefined variable and press Enter to add it to the selected scope.
 */
export const defineVariable = async (page: Page, name: string, value: string) => {
  await test.step(`Define "${name}" from the Not defined section`, async () => {
    const editor = buildVariablesSidebarLocators(page).defineEditor(name);
    await editor.locator('.CodeMirror').click();
    await page.keyboard.type(value);
    await page.keyboard.press('Enter');
  });
};
