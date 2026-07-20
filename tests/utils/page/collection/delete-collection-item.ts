import { Page } from '../../../../playwright';

/**
 * Confirmation modal shown when deleting a collection item (request or folder).
 */
export const buildDeleteCollectionItemModalLocators = (page: Page) => {
  const modal = () => page.getByTestId('delete-collection-item-modal');

  return {
    modal,
    submitButton: () => modal().getByTestId('delete-collection-item-modal-submit-btn')
  };
};
