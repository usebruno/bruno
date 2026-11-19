import { Page } from '../../../../playwright';

// Share Collection modal, opened from the collection row's Share action or from collection settings.
export const buildShareCollectionLocators = (page: Page) => {
  const modal = () => page.getByTestId('share-collection-modal');

  return {
    modal,
    closeButton: () => modal().getByTestId('modal-close-button'),
    zipFormatCard: () => modal().getByTestId('export-format-zip'),
    yamlFormatCard: () => modal().getByTestId('export-format-yaml'),
    postmanFormatCard: () => modal().getByTestId('export-format-postman'),
    nonExportableNote: () => modal().getByTestId('share-collection-non-exportable-note'),
    proceedButton: () => modal().getByTestId('share-collection-proceed')
  };
};
