import path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { createCollection } from '../../utils/page';

const openCollectionActionsMenu = async (page: Page, collectionName: string) => {
  await test.step(`Open actions menu for collection "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collectionRow(collectionName).hover();
    await locators.actions.collectionActions(collectionName).click();
  });
};

const clickRemoveInCollectionMenu = async (page: Page) => {
  const locators = buildCommonLocators(page);
  await locators.dropdown.item('Remove').click();
  await locators.modal.removeCollection.modal().waitFor({ state: 'visible', timeout: 5000 });
};

const confirmRemoveCollection = async (page: Page) => {
  const locators = buildCommonLocators(page);
  const removeModal = locators.modal.removeCollection;

  const hasDiscardButton = await removeModal.discardAllAndRemoveButton().isVisible().catch(() => false);

  if (hasDiscardButton) {
    await removeModal.discardAllAndRemoveButton().click();
  } else {
    await removeModal.removeButton().click();
  }

  await removeModal.modal().waitFor({ state: 'hidden' });
};

test.describe('Open collection sanity testcases', () => {
  test('TC-2614: Verify user able to Remove the Opened collection from the sidebar', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'remove-test-collection';
    const collectionLocation = await createTmpDir(collectionName);
    const collectionPath = path.join(collectionLocation, collectionName);
    const locators = buildCommonLocators(page);

    await test.step('create collection', async () => {
      await createCollection(page, collectionName, collectionLocation);
    });

    await test.step('open collection actions menu and verify Remove option is shown', async () => {
      await openCollectionActionsMenu(page, collectionName);
      await expect(locators.dropdown.item('Remove')).toBeVisible();
    });

    await test.step('click Remove and verify confirmation modal shows path and CTAs', async () => {
      await clickRemoveInCollectionMenu(page);
      const removeModal = locators.modal.removeCollection;
      await expect(removeModal.modal()).toBeVisible();
      await expect(removeModal.removeButton()).toBeVisible();
      await expect(removeModal.cancelButton()).toBeVisible();
      await expect(removeModal.path()).toContainText(collectionPath);
    });

    await test.step('confirm removal and verify success toast', async () => {
      await confirmRemoveCollection(page);
      await expect(locators.toast.collectionRemovedFromWorkspace()).toBeVisible();
      await expect(locators.sidebar.collection(collectionName)).not.toBeVisible();
    });
  });
});
