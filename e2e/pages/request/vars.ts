import { test, expect, Page } from '../../playwright';
import { buildTableLocator } from '../shared-ui/table';

/** Types a name and value into the last row of a Vars table. */
export const addVarsRow = async (page: Page, tableId: string, name: string, value: string) => {
  await test.step(`Add "${name}" to ${tableId}`, async () => {
    const table = buildTableLocator(page);
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

/**
 * Locators for the folder or collection Vars panel.
 * @returns A function of the panel scope ('folder' | 'collection') that returns its locators
 */
export const buildVarsPanelLocators = (page: Page) => (scope: 'folder' | 'collection') => {
  const container = () => page.getByTestId(`${scope}-vars-panel`);
  return {
    container,
    saveButton: () => container().getByRole('button', { name: 'Save', exact: true })
  };
};
