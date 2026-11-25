import { Page, expect, test } from '../../playwright';

type VariablesView = 'used' | 'all';
type RowAction = 'copy' | 'clear' | 'secret-toggle' | 'object-expand';
type ValueTokenType = 'string' | 'number' | 'boolean' | 'property' | 'variable';

const VALUE_TOKEN_CLASSES: Record<ValueTokenType, string> = {
  string: 'cm-string',
  number: 'cm-number',
  boolean: 'cm-atom',
  property: 'cm-property',
  variable: 'cm-variable-valid'
};

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
    rowAction: (sectionKey: string, name: string, action: RowAction) => row(sectionKey, name)
      .getByTestId(action === 'object-expand' ? 'variable-object-expand' : `variable-row-${action}`),
    rowMultiLineValue: (sectionKey: string, name: string) => row(sectionKey, name).getByTestId('variable-multiline-editor'),
    valueToken: (sectionKey: string, name: string, tokenType: ValueTokenType) =>
      row(sectionKey, name).locator(`.CodeMirror-line .${VALUE_TOKEN_CLASSES[tokenType]}`).first(),
    valueTokens: (sectionKey: string, name: string) => row(sectionKey, name).locator('.CodeMirror-line span[class*="cm-"]'),
    sectionPill: (sectionKey: string) => sidebar()
      .getByTestId(`variables-sidebar-${sectionKey}-section`)
      .getByTestId('variables-scope-pill'),
    objectView: () => sidebar().getByTestId('variables-sidebar-object-view'),
    objectViewName: () => sidebar().getByTestId('variables-sidebar-object-name'),
    objectViewBack: () => sidebar().getByTestId('variables-sidebar-object-back'),
    emptyState: () => sidebar().getByTestId('variables-sidebar-empty'),
    valueEditor: () => sidebar().getByTestId('variables-sidebar-value-editor'),
    defineEditor: (name: string) => row('undefined', name).getByTestId('variables-sidebar-define-editor'),
    viewTab: (view: VariablesView) => sidebar().getByTestId(`responsive-tab-${view}`),
    scroller: (view: VariablesView) => sidebar().getByTestId(`variables-sidebar-${view}`)
  };
};

/**
 * Open the Variables sidebar from the toolbar of the active tab and show every variable.
 */
export const openVariablesSidebar = async (page: Page) => {
  await test.step('Open the Variables sidebar', async () => {
    const { sidebar, viewTab } = buildVariablesSidebarLocators(page);
    if (!(await sidebar().isVisible())) {
      await page.getByTestId('variables-sidebar-toggle').click();
    }
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

export const scrollVariablesView = async (page: Page, view: VariablesView, top: number) => {
  await test.step(`Scroll the "${view}" variables view to ${top}`, async () => {
    await buildVariablesSidebarLocators(page).scroller(view).evaluate((element, y) => element.scrollTo(0, y), top);
  });
};

export const scrollVariableObjectValue = async (page: Page, sectionKey: string, name: string, top: number) => {
  await test.step(`Scroll inside the "${name}" object value to ${top}`, async () => {
    await buildVariablesSidebarLocators(page)
      .rowMultiLineValue(sectionKey, name)
      .locator('.CodeMirror-scroll')
      .evaluate((element, y) => element.scrollTo(0, y), top);
  });
};

export const readVariableObjectValueScroll = (page: Page, sectionKey: string, name: string): Promise<number> =>
  buildVariablesSidebarLocators(page)
    .rowMultiLineValue(sectionKey, name)
    .locator('.CodeMirror-scroll')
    .evaluate((element) => Math.round(element.scrollTop));

export const readVariablesViewScroll = (page: Page, view: VariablesView): Promise<number> =>
  buildVariablesSidebarLocators(page).scroller(view).evaluate((element) => Math.round(element.scrollTop));

/**
 * Virtuoso corrects the offset while it measures rows, so wait until two reads in a row agree.
 */
export const readSettledVariablesViewScroll = async (page: Page, view: VariablesView): Promise<number> => {
  let previous = -1;
  await expect.poll(async () => {
    const current = await readVariablesViewScroll(page, view);
    const isSettled = current === previous;
    previous = current;
    return isSettled;
  }, { intervals: [200] }).toBe(true);
  return previous;
};

export const readFirstVisibleRow = (page: Page, view: VariablesView): Promise<string | null> =>
  buildVariablesSidebarLocators(page).scroller(view).evaluate((element) => {
    const top = element.getBoundingClientRect().top;
    const rows = Array.from(element.querySelectorAll('tbody tr[data-row-name]'));
    const firstVisible = rows.find((row) => row.getBoundingClientRect().bottom > top + 1);
    return firstVisible ? firstVisible.getAttribute('data-row-name') : null;
  });

export const readVariablesViewDistanceFromBottom = (page: Page, view: VariablesView): Promise<number> =>
  buildVariablesSidebarLocators(page).scroller(view).evaluate((element) =>
    Math.round(element.scrollHeight - element.clientHeight - element.scrollTop)
  );

/**
 * Measuring the rows near the end grows the list, so keep scrolling until the view stays at the bottom.
 */
export const scrollVariablesViewToBottom = async (page: Page, view: VariablesView) => {
  await test.step(`Scroll the "${view}" variables view to the bottom`, async () => {
    const scroller = buildVariablesSidebarLocators(page).scroller(view);
    await expect(async () => {
      await scroller.evaluate((element) => element.scrollTo(0, element.scrollHeight));
      await page.waitForTimeout(300);
      expect(await readVariablesViewDistanceFromBottom(page, view)).toBeLessThanOrEqual(1);
    }).toPass({ timeout: 10000 });
  });
};

/**
 * Row actions only show on hover, so hover the row before clicking one.
 */
export const clickVariableRowAction = async (page: Page, sectionKey: string, name: string, action: RowAction) => {
  await test.step(`Click "${action}" on "${name}" in the ${sectionKey} section`, async () => {
    const { row, rowAction } = buildVariablesSidebarLocators(page);
    await row(sectionKey, name).hover();
    await rowAction(sectionKey, name, action).click();
  });
};

/**
 * Clicking the count toggles the section, while clicking the title would open the scope's settings.
 */
export const toggleVariablesSection = async (page: Page, sectionKey: string) => {
  await test.step(`Toggle the ${sectionKey} section`, async () => {
    await buildVariablesSidebarLocators(page).sectionCount(sectionKey).click();
  });
};

export const clearVariablesSidebarPreferences = async (page: Page) => {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('variables-sidebar.'))
      .forEach((key) => localStorage.removeItem(key));
  });
};
