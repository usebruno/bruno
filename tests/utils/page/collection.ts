import { Page, expect, test } from '../../../playwright';
import { buildCommonLocators } from './locators';

/**
 * Builds locators for collection sidebar actions (remove modal, success toast).
 */
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

/**
 * Hover a collection row and open its actions (three-dots) menu.
 */
export const openCollectionActionsMenu = async (page: Page, collectionName: string) => {
  await test.step(`Open actions menu for collection "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collectionRow(collectionName).hover();
    await locators.actions.collectionActions(collectionName).click();
  });
};

/**
 * Click Remove in the open collection actions menu and wait for the confirmation modal.
 */
export const clickRemoveInCollectionMenu = async (page: Page) => {
  const locators = buildCommonLocators(page);
  const collectionLocators = buildCollectionLocators(page);
  await locators.dropdown.item('Remove').click();
  await collectionLocators.removeModal().waitFor({ state: 'visible', timeout: 5000 });
};

/**
 * Confirm removal in the Remove Collection modal (handles drafts modal when present).
 */
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
