import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  openNewRequestModal
} from '../../utils/page';

test.describe('New Request filename validation', () => {
  test.afterEach(async ({ page }) => {
    const { modal } = buildCommonLocators(page);
    if (await modal.byTitle('New Request').isVisible()) {
      await modal.button('Cancel').click();
    }
    await closeAllCollections(page);
  });

  for (const reservedName of ['folder', 'collection']) {
    test(`shows the reserved filename error for "${reservedName}" with filesystem names hidden`, async ({ page, createTmpDir }) => {
      const collectionName = 'filename-validation';
      const { modal, request, sidebar, dropdown } = buildCommonLocators(page);
      const dialog = modal.byTitle('New Request');
      const error = modal.formError('The file names "collection" and "folder" are reserved in bruno');

      await createCollection(page, collectionName, await createTmpDir());
      await openNewRequestModal(page, collectionName);
      await request.requestNameInput().fill(reservedName);
      await sidebar.newRequestModal.createButton().click();

      await expect(dialog).toBeVisible();
      await expect(error).toBeVisible();

      await sidebar.filesystemName.optionsButton().click();
      await sidebar.filesystemName.showFilesystemNameItem().click();
      await expect(error).toBeVisible();
      await expect(error).toHaveCount(1);

      await sidebar.filesystemName.optionsButton().click();
      await dropdown.item('Hide Filesystem Name').click();
      await expect(error).toBeVisible();
      await expect(error).toHaveCount(1);

      await request.requestNameInput().fill('Valid request');
      await expect(error).toBeHidden();
      await sidebar.newRequestModal.createButton().click();

      await expect(dialog).toBeHidden();
      await expect(sidebar.request('Valid request')).toBeVisible();
    });
  }
});
