import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, createCollection } from '../../utils/page';

test.describe('Remove collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-123: Verify removing a collection from the sidebar', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'remove-collection';
    const collectionLocation = await createTmpDir('remove-collection');
    const collectionPath = path.join(collectionLocation, collectionName);
    const { sidebar, dropdown, modal, toast } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
      expect(fs.existsSync(path.join(collectionPath, 'opencollection.yml'))).toBe(true);
    });

    await test.step('Remove the collection from the sidebar menu', async () => {
      const collectionMenu = sidebar.rowMenu(collectionName, 'collection');
      await sidebar.collectionRow(collectionName).hover();
      await collectionMenu.trigger().click();
      await dropdown.item('Remove').click();

      const removeModal = modal.byTitle('Remove Collection');
      await expect(removeModal).toBeVisible();
      await expect(removeModal).toContainText('Are you sure you want to close the following collection in Bruno?');
      await expect(removeModal).toContainText(collectionName);
      await expect(removeModal).toContainText(
        'It will still be available in the filesystem at the above location and can be re-opened later.'
      );
      await expect(removeModal.getByRole('button', { name: 'Remove', exact: true })).toBeVisible();
      await expect(removeModal.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();

      await removeModal.getByRole('button', { name: 'Remove' }).click();
      await expect(removeModal).toHaveCount(0);
      await expect(toast.byMessage('Collection removed from workspace').first()).toBeVisible();
    });

    await test.step('Collection is no longer listed in the sidebar', async () => {
      await expect(sidebar.collection(collectionName)).toHaveCount(0);
    });

    await test.step('Collection files remain on disk', async () => {
      expect(fs.existsSync(path.join(collectionPath, 'opencollection.yml'))).toBe(true);
    });
  });
});
