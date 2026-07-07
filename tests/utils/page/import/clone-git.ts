import { Page } from '../../../../playwright';

/**
 * Locators for the Clone Git Repository modal and collection selection list.
 */
export const buildCloneGitLocators = (page: Page) => {
  const modal = () => page.getByTestId('clone-git-repository-modal');
  const collectionsList = () => modal().getByTestId('clone-git-selection-list');
  const collectionItem = (name: string) =>
    collectionsList()
      .getByTestId('selection-list-item')
      .filter({ has: page.getByTestId('selection-list-item-title').getByText(name, { exact: true }) });

  return {
    cloneGitModal: modal,
    cloneGitLocationInput: () => modal().getByTestId('clone-git-collection-location-input'),
    cloneGitSubmitButton: () => modal().getByTestId('clone-git-repository-modal-submit-btn'),
    cloneGitCollectionItemTitle: (name: string) =>
      collectionsList().getByTestId('selection-list-item-title').getByText(name, { exact: true }),
    cloneGitCollectionCheckbox: (name: string) =>
      collectionItem(name).getByTestId('selection-list-item-checkbox')
  };
};
