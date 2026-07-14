import { test, Page } from '../../../playwright';
import { buildCommonLocators } from './locators';

// Clicks the sort toggle once: default -> asc -> desc -> default.
export const cycleVariableSort = async (page: Page) => {
  await test.step('Cycle variable sort mode', async () => {
    await buildCommonLocators(page).environment.sortToggle().click();
  });
};

// Displayed variable names, top to bottom, excluding the trailing empty row.
export const getVisibleVariableNames = async (page: Page): Promise<string[]> => {
  const values = await buildCommonLocators(page)
    .environment.visibleNameInputs()
    .evaluateAll((inputs) => inputs.map((el) => (el as HTMLInputElement).value));
  return values.filter((name) => name !== '');
};

// Drags row `fromName` onto row `toName` (Manual sort mode only).
export const dragVariableRow = async (page: Page, fromName: string, toName: string) => {
  await test.step(`Drag variable row "${fromName}" onto "${toName}"`, async () => {
    const common = buildCommonLocators(page);
    await common.environment.varRow(fromName).dragTo(common.environment.varRow(toName), {
      targetPosition: { x: 5, y: 5 }
    });
  });
};
