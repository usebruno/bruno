import { test, expect, Page } from '../../playwright';
import { buildTableLocator } from '../shared-ui/table';

/**
 * Locators for the request Assertions table.
 */
export const buildAssertionsTableLocator = (page: Page) => () => {
  const baseTable = buildTableLocator(page)('assertions-table');
  return {
    ...baseTable,
    // Assertion-specific helpers
    rowExprInput: (rowIndex: number) => {
      const cell = baseTable.rowCell('name', rowIndex);
      // Wait for the cell to be visible, then find the textbox
      return cell.getByRole('textbox').or(cell.locator('input[type="text"]'));
    },
    rowOperatorSelect: (rowIndex: number) => {
      const cell = baseTable.rowCell('operator', rowIndex);
      return cell.getByTestId('assertion-operator-select').or(cell.locator('select'));
    },
    rowValueInput: (rowIndex: number) => baseTable.rowCell('value', rowIndex)
  };
};

const buildLocators = (page: Page) => ({
  assertionsTable: buildAssertionsTableLocator(page)
});

export type AssertionInput = {
  expr: string;
  value: string;
  operator?: string;
};

/**
 * Add an assertion to the current request (adds to the last empty row)
 * @param page - The page object
 * @param assertion - The assertion to add (expr, value, optional operator)
 * @returns The row index where the assertion was added
 */
export const addAssertion = async (page: Page, assertion: AssertionInput): Promise<number> => {
  const operator = assertion.operator || 'eq';

  return await test.step(`Add assertion: ${assertion.expr} ${operator} ${assertion.value}`, async () => {
    const locators = buildLocators(page);
    const table = locators.assertionsTable();

    // Ensure assertions table is visible
    await expect(table.container()).toBeVisible();

    // Find the last row (which is the empty row for adding new assertions)
    const rowCount = await table.allRows().count();
    const targetRowIndex = rowCount - 1; // Last row is the empty row

    // Wait for the row to exist
    await expect(table.row(targetRowIndex)).toBeVisible();

    // Fill in the expression
    const exprInput = table.rowExprInput(targetRowIndex);
    await expect(exprInput).toBeVisible({ timeout: 2000 });
    await exprInput.click();
    await page.keyboard.type(assertion.expr);

    // The component creates a new empty row when the key field is filled
    await expect(table.allRows()).toHaveCount(rowCount + 1);

    // Fill in the value first (defaults to 'eq value')
    const valueInput = table.rowValueInput(targetRowIndex);
    await valueInput.click();
    await page.keyboard.type(assertion.value);

    // Select the operator from dropdown (if provided and not default 'eq')
    // This will update the value field to combine operator + value
    if (assertion.operator && assertion.operator !== 'eq') {
      const operatorSelect = table.rowOperatorSelect(targetRowIndex);
      await operatorSelect.selectOption(assertion.operator);
    }

    // Wait for the assertion to be fully processed
    // Verify the expression was actually saved by checking the input value
    const exprInputAfter = table.rowExprInput(targetRowIndex);
    await expect(exprInputAfter).toHaveValue(assertion.expr, { timeout: 2000 });

    return targetRowIndex;
  });
};

/**
 * Edit an assertion at a specific row index
 * @param page - The page object
 * @param rowIndex - The row index of the assertion to edit
 * @param assertion - The assertion data to update (expr, value, optional operator)
 * @returns void
 */
export const editAssertion = async (page: Page, rowIndex: number, assertion: AssertionInput) => {
  const operator = assertion.operator || 'eq';

  await test.step(`Edit assertion at row ${rowIndex}: ${assertion.expr} ${operator} ${assertion.value}`, async () => {
    const locators = buildLocators(page);
    const table = locators.assertionsTable();

    // Ensure assertions table is visible
    await expect(table.container()).toBeVisible();

    // Wait for the row to exist
    await expect(table.row(rowIndex)).toBeVisible();

    // Update the expression
    const exprInput = table.rowExprInput(rowIndex);
    await expect(exprInput).toBeVisible({ timeout: 2000 });
    await exprInput.click();
    // Clear the input and type new value - use triple-click to select all (works cross-platform)
    await exprInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace'); // Clear selection
    await page.keyboard.type(assertion.expr);

    // Update the operator from dropdown (if provided)
    if (assertion.operator) {
      const operatorSelect = table.rowOperatorSelect(rowIndex);
      await operatorSelect.selectOption(assertion.operator);
    }

    // Update the value (just the value, operator is already selected)
    // The value cell contains a SingleLineEditor, so we need to click and type
    const valueInput = table.rowValueInput(rowIndex);
    await valueInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace'); // Clear selection
    await page.keyboard.type(assertion.value);
  });
};

/**
 * Delete an assertion from the current request by row index
 * @param page - The page object
 * @param rowIndex - The row index of the assertion to delete
 * @returns void
 */
export const deleteAssertion = async (page: Page, rowIndex: number) => {
  await test.step(`Delete assertion at row ${rowIndex}`, async () => {
    const locators = buildLocators(page);
    const table = locators.assertionsTable();

    await expect(table.container()).toBeVisible();

    const initialRowCount = await table.allRows().count();
    const deleteButton = table.rowDeleteButton(rowIndex);

    await deleteButton.click();
    await expect(table.allRows()).toHaveCount(initialRowCount - 1);
  });
};
