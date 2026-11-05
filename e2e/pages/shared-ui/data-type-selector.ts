import { Locator, Page } from '../../playwright';

/**
 * Locators for the DataTypeSelector on variable rows (request/folder/collection vars and env vars).
 * Compact mode shows an icon; full mode shows `.type-label`.
 */
export const buildDataTypeSelectorLocators = (page: Page) => ({
  trigger: (row: Locator) => row.getByTestId('datatype-selector-trigger'),
  typeLabel: (row: Locator) => row.getByTestId('datatype-selector-trigger'),
  // Yellow warning icon shown when a value can't be coerced to its dataType.
  mismatchIcon: (row: Locator) => row.locator('svg.text-yellow-600'),
  menuItem: (type: string) => page.locator('[role="menu"]').last().getByText(type, { exact: true })
});
