import { test, Page } from '../../../playwright';
import { buildCommonLocators } from './locators';

export const buildVariableSortLocators = (page: Page) => {
  const common = buildCommonLocators(page);
  return {
    /** The Name column's sort-cycle button (Environment vars: one instance, Variables tab only). */
    sortToggle: () => page.getByTestId('column-sort-toggle'),
    /** The drag-handle grip icon for a named row — present in the DOM only when dragging is enabled for it. */
    dragHandle: (name: string) => common.environment.varRow(name).getByTestId('drag-handle'),
    /** Every visible row's Name `<input>`, in on-screen (render) order, including the trailing empty "add new" row. */
    visibleNameInputs: () => common.environment.varRows().locator('input[name$=".name"]')
  };
};

/** Clicks the sort toggle once, advancing default → asc → desc → default. */
export const cycleVariableSort = async (page: Page) => {
  await test.step('Cycle variable sort mode', async () => {
    await buildVariableSortLocators(page).sortToggle().click();
  });
};

export const getVisibleVariableNames = async (page: Page): Promise<string[]> => {
  const values = await buildVariableSortLocators(page)
    .visibleNameInputs()
    .evaluateAll((inputs) => inputs.map((el) => (el as HTMLInputElement).value));
  return values.filter((name) => name !== '');
};

export const dragVariableRow = async (page: Page, fromName: string, toName: string) => {
  await test.step(`Drag variable row "${fromName}" onto "${toName}"`, async () => {
    const common = buildCommonLocators(page);
    await common.environment.varRow(fromName).dragTo(common.environment.varRow(toName), {
      targetPosition: { x: 5, y: 5 }
    });
  });
};
