import { Locator, Page } from '../../playwright';

export const buildOpenCollectionModalLocators = (page: Page) => ({
  root: (): Locator => page.getByTestId('open-collection-modal'),
  closeButton: (): Locator => page.getByTestId('open-collection-close'),
  menuItem: (pageId: string): Locator => page.getByTestId(`open-collection-menu-item-${pageId}`),
  menuItemSpinner: (pageId: string): Locator => page.getByTestId(`open-collection-menu-item-${pageId}-spinner`),
  page: (pageId: string): Locator => page.getByTestId(`open-collection-page-${pageId}`)
});
