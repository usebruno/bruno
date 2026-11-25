import { Page } from '../../playwright';

const openCollectionPickerItem = (page: Page, name: string) =>
  page.getByTestId('selection-list').getByRole('listitem').filter({
    has: page.getByText(name, { exact: true })
  });

/**
 * Locators for the selection list in the Open Collection dialog.
 */
export const buildOpenCollectionPickerLocators = (page: Page) => ({
  list: () => page.getByTestId('selection-list'),
  titles: () => page.getByTestId('selection-list').locator('.selection-item-title'),
  descriptions: () => page.getByTestId('selection-list').locator('.selection-item-description'),
  item: (name: string) => openCollectionPickerItem(page, name),
  itemCheckbox: (name: string) => openCollectionPickerItem(page, name).getByRole('checkbox'),
  /** The location a listed collection reports, relative to the picked folder. */
  itemDescription: (name: string) => openCollectionPickerItem(page, name).locator('.selection-item-description'),
  count: () => page.getByTestId('selection-count'),
  selectAllToggle: () => page.getByTestId('selection-select-all-toggle').getByRole('checkbox'),
  searchInput: () => page.getByTestId('selection-search-input')
});
