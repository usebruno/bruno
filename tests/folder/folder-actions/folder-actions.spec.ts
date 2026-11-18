import { test, expect } from '../../../playwright';
import { buildCommonLocators, expandCollection, expandFolder, openItemActionsMenu, renameItemTo } from '../../utils/page';

const collectionName = 'folder-actions';

test.describe('Folder actions', () => {
  test('TC-367: Verify that user is able to Rename a parent folder.', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { sidebar, toast } = buildCommonLocators(page);

    await expandCollection(page, collectionName);
    await expandFolder(page, 'parent-folder');
    await sidebar.itemInFolder('parent-folder', 'child-folder').waitFor({ state: 'visible' });

    await renameItemTo(page, 'parent-folder', 'renamed-parent', 'folder');

    await test.step('Renamed parent stays in the collection and still contains the child folder', async () => {
      await expect(toast.byMessage('Item renamed successfully').first()).toBeVisible();
      await expect(sidebar.itemByName('renamed-parent')).toBeVisible();
      await expect(sidebar.itemByName('parent-folder')).toHaveCount(0);
      await expandFolder(page, 'renamed-parent');
      await expect(sidebar.itemInFolder('renamed-parent', 'child-folder')).toBeVisible();
    });
  });

  test('TC-179: verify that the user is able to Delete the Folder', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { modal, sidebar } = buildCommonLocators(page);

    await expandCollection(page, collectionName);
    await sidebar.scopedItem(collectionName, 'orders').waitFor({ state: 'visible' });

    await openItemActionsMenu(page, 'orders');
    await sidebar.rowMenu('orders').item('delete').click();
    await modal.button('Delete').click();

    await test.step('Folder is removed from the collection', async () => {
      await expect(sidebar.scopedItem(collectionName, 'orders')).toHaveCount(0);
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });
  });

  test('TC-178: Verify that the user is able to Clone the Folder', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { sidebar, toast } = buildCommonLocators(page);

    await expandCollection(page, collectionName);
    await sidebar.scopedItem(collectionName, 'billing').waitFor({ state: 'visible' });

    await openItemActionsMenu(page, 'billing');
    await sidebar.rowMenu('billing').item('clone').click();

    await test.step('Folder clone is added and the original folder remains', async () => {
      await expect(toast.byMessage('Folder cloned!').first()).toBeVisible();
      await expect(sidebar.scopedItem(collectionName, 'billing')).toBeVisible();
      await expect(sidebar.scopedItem(collectionName, 'billing copy')).toBeVisible();
    });
  });
});
