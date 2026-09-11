import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCollectionLocators,
  buildCommonLocators,
  clickRemoveInCollectionMenu,
  closeAllCollections,
  confirmRemoveCollection,
  createCollection,
  openCollectionActionsMenu
} from '../../utils/page';

test.describe('Open collection sanity testcases', () => {
  test('TC-2614: Verify user able to Remove the Opened collection from the sidebar', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'remove-test-collection';
    const collectionLocation = await createTmpDir(collectionName);
    const collectionPath = path.join(collectionLocation, collectionName);
    const locators = buildCommonLocators(page);
    const collectionLocators = buildCollectionLocators(page);
    await createCollection(page, collectionName, collectionLocation);

    await test.step('Open Bruno app and click on the collection menu (3 dots) on the right side of the collection', async () => {
      await openCollectionActionsMenu(page, collectionName);
      await expect(locators.dropdown.item('Remove')).toBeVisible();
    });

    await test.step('click on the remove option', async () => {
      await clickRemoveInCollectionMenu(page);
      await expect(collectionLocators.removeModal()).toBeVisible();
      await expect(collectionLocators.removeButton()).toBeVisible();
      await expect(collectionLocators.cancelButton()).toBeVisible();
      await expect(collectionLocators.removeModalPath()).toContainText(collectionPath);
    });

    await test.step('Click on the remove CTA on the pop-up ', async () => {
      await confirmRemoveCollection(page);
      await expect(collectionLocators.removedFromWorkspaceToast()).toBeVisible();
      await expect(locators.sidebar.collection(collectionName)).not.toBeVisible();
    });
  });
});
