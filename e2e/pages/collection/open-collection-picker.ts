import { Page } from '../../playwright';

/**
 * Locators for the selection list in the Open Collection dialog.
 */
export const buildOpenCollectionPickerLocators = (page: Page) => ({
  list: () => page.getByTestId('selection-list'),
  titles: () => page.getByTestId('selection-list').locator('.selection-item-title'),
  descriptions: () => page.getByTestId('selection-list').locator('.selection-item-description'),
  item: (name: string) =>
    page.getByTestId('selection-list').getByRole('listitem').filter({
      has: page.getByText(name, { exact: true })
    }),
  itemCheckbox: (name: string) =>
    page.getByTestId('selection-list').getByRole('listitem').filter({
      has: page.getByText(name, { exact: true })
    }).getByRole('checkbox'),
  count: () => page.getByTestId('selection-count'),
  selectAllToggle: () => page.getByTestId('selection-select-all-toggle').getByRole('checkbox'),
  searchInput: () => page.getByTestId('selection-search-input')
});
