import { Page, test } from '../../playwright';
import { buildSidebarLocators } from '../sidebar/collection-tree';
import { buildItemActionLocators } from '../sidebar/item-actions';
import { buildDropdownLocators } from '../shared-ui/dropdown';

export const buildCollectionLocators = (page: Page) => {
  const removeModal = () => page.locator('.bruno-modal').filter({ hasText: 'Remove Collection' });

  return {
    removeModal,
    removeModalPath: () => removeModal().locator('.collection-path'),
    removeButton: () => removeModal().getByRole('button', { name: 'Remove', exact: true }),
    cancelButton: () => removeModal().getByRole('button', { name: 'Cancel', exact: true }),
    discardAllAndRemoveButton: () => page.getByRole('button', { name: 'Discard All and Remove' }),
    removedFromWorkspaceToast: () => page.getByText('Collection removed from workspace')
  };
};

export const openCollectionActionsMenu = async (page: Page, collectionName: string) => {
  await test.step(`Open actions menu for collection "${collectionName}"`, async () => {
    await buildSidebarLocators(page).collectionRow(collectionName).hover();
    await buildItemActionLocators(page).collectionActions(collectionName).click();
  });
};

export const clickRemoveInCollectionMenu = async (page: Page) => {
  const collectionLocators = buildCollectionLocators(page);
  await buildDropdownLocators(page).item('Remove').click();
  await collectionLocators.removeModal().waitFor({ state: 'visible', timeout: 5000 });
};

export const confirmRemoveCollection = async (
  page: Page,
  options: { forceDiscard?: boolean } = {}
) => {
  await test.step('Confirm Remove Collection', async () => {
    const collectionLocators = buildCollectionLocators(page);
    const hasDiscardButton = await collectionLocators.discardAllAndRemoveButton().isVisible().catch(() => false);

    if (hasDiscardButton) {
      await collectionLocators.discardAllAndRemoveButton().click(
        options.forceDiscard ? { force: true } : undefined
      );
    } else {
      await collectionLocators.removeButton().click();
    }

    await collectionLocators.removeModal().waitFor({ state: 'hidden', timeout: 5000 });
  });
};
