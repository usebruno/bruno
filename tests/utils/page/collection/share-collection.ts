import { Locator, Page } from '../../../../playwright';

// Locators for the Share Collection modal opened from collection settings.
// OSS shows ZIP / YAML / Postman. Enterprise adds Git / Export / Embed tabs and an OpenAPI card.
export const buildShareCollectionLocators = (page: Page) => {
  const modal = (): Locator => page.getByTestId('share-collection-modal');

  return {
    modal,
    gitTab: (): Locator => page.getByTestId('share-collection-tab-git'),
    exportTab: (): Locator => page.getByTestId('share-collection-tab-export'),
    embedTab: (): Locator => page.getByTestId('share-collection-tab-embed'),
    zipCard: (): Locator => page.getByTestId('export-format-zip'),
    yamlCard: (): Locator => page.getByTestId('export-format-yaml'),
    postmanCard: (): Locator => page.getByTestId('export-format-postman'),
    openApiCard: (): Locator => page.getByTestId('export-format-openapi'),
    closeButton: (): Locator => modal().getByTestId('modal-close-button')
  };
};
