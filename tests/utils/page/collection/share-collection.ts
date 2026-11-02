import { Locator, Page } from '../../../../playwright';

// Locators for the Share Collection modal opened from collection settings.
export const buildShareCollectionLocators = (page: Page) => {
  const modal = (): Locator => page.getByTestId('share-collection-modal');

  return {
    modal,
    zipCard: (): Locator => page.getByTestId('export-format-zip'),
    yamlCard: (): Locator => page.getByTestId('export-format-yaml'),
    postmanCard: (): Locator => page.getByTestId('export-format-postman'),
    formatCards: (): Locator => page.getByTestId(/^export-format-/),
    closeButton: (): Locator => modal().getByTestId('modal-close-button')
  };
};
