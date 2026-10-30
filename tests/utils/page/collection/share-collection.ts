import { Locator, Page } from '../../../../playwright';

// Locators for the Share Collection modal opened from collection settings.
export const buildShareCollectionLocators = (page: Page) => {
  const modal = (): Locator =>
    page.locator('.bruno-modal').filter({
      has: page.locator('.bruno-modal-header-title').filter({ hasText: 'Share Collection' })
    });

  return {
    modal,
    zipCard: (): Locator => modal().locator('.format-card').filter({ hasText: 'Bruno Collection (ZIP)' }),
    yamlCard: (): Locator => modal().locator('.format-card').filter({ hasText: 'Single File (YAML)' }),
    postmanCard: (): Locator => modal().locator('.other-format-card').filter({ hasText: 'Export for Postman' }),
    formatCards: (): Locator => modal().locator('.format-card, .other-format-card'),
    closeButton: (): Locator => modal().getByTestId('modal-close-button')
  };
};
