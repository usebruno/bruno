import { Page, test } from '../../playwright';
import { buildDropdownLocators } from '../shared-ui/dropdown';
import { openCollectionActionsMenu } from './remove';

export const buildRenameCollectionLocators = (page: Page) => {
  const modal = () => page.getByTestId('rename-collection-modal');

  return {
    modal,
    nameInput: () => modal().getByTestId('rename-collection-name-input'),
    confirmButton: () => modal().getByTestId('rename-collection-modal-submit-btn')
  };
};

export const renameCollectionFromMenu = async (page: Page, collectionName: string, newName: string) => {
  await test.step(`Rename collection "${collectionName}" to "${newName}" from the actions menu`, async () => {
    const renameCollection = buildRenameCollectionLocators(page);
    await openCollectionActionsMenu(page, collectionName);
    await buildDropdownLocators(page).item('Rename').click();
    await renameCollection.modal().waitFor({ state: 'visible' });
    await renameCollection.nameInput().fill(newName);
    await renameCollection.confirmButton().click();
    await renameCollection.modal().waitFor({ state: 'hidden' });
  });
};
