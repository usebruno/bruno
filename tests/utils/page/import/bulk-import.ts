import { Page } from '../../../../playwright';

/**
 * Bulk-import selection UI locators (bulkModal, bulkSubmitButton, bulkFormatSelect,
 * bulkLocationInput live in locators.ts).
 */
export const buildBulkImportSelectionLocators = (page: Page) => {
  const bulkModal = () => page.getByTestId('bulk-import-collection-location-modal');
  const collectionsSection = () => bulkModal().getByTestId('selection-section-collections');

  return {
    bulkModalTitle: () => bulkModal().getByTestId('bulk-import-header-title'),
    bulkCollectionsCount: () => collectionsSection().getByTestId('selection-count'),
    bulkCollectionItem: (name: string) => collectionsSection().getByTestId('selection-list').getByText(name, { exact: true })
  };
};
