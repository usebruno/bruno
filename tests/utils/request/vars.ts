import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from '../page/locators';

/** Types a name and value into the last row of a Vars table. */
export const addVarsRow = async (page: Page, tableId: string, name: string, value: string) => {
  await test.step(`Add "${name}" to ${tableId}`, async () => {
    const { table } = buildCommonLocators(page);
    const varsTable = table(tableId);
    const nameInput = varsTable.rowNameInput(varsTable.row().last());
    await nameInput.click();
    await page.keyboard.type(name);

    const row = varsTable.rowByName(name);
    await expect(row).toBeVisible();

    const valueEditor = varsTable.rowValueEditor(row);
    await valueEditor.click({ force: true });
    await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
    await page.keyboard.insertText(value);
  });
};
