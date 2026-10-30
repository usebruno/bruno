import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection } from '../../utils/page';

test.describe('Remove collection', () => {
  test('TC-2614 should remove a collection from the sidebar without deleting its files', { tag: '@sanity' }, async ({ newPage: page, createTmpDir }) => {
    const collectionName = 'remove-test-collection';
    const tmpDir = await createTmpDir(collectionName);
    const collectionFile = path.join(tmpDir, collectionName, 'opencollection.yml');
    const { sidebar, actions, dropdown, modal, toast } = buildCommonLocators(page);

    const originalContent = await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, tmpDir);
      await expect(sidebar.collection(collectionName)).toBeVisible();
      return fs.readFileSync(collectionFile, 'utf-8');
    });

    await test.step('Open Remove from the collection menu', async () => {
      await sidebar.collection(collectionName).hover();
      await actions.collectionActions(collectionName).click();
      await dropdown.item('Remove').click();
    });

    await test.step('Confirm the Remove dialog', async () => {
      const removeModal = modal.byTitle('Remove Collection');
      await expect(removeModal).toBeVisible();
      await expect(removeModal).toContainText(collectionName);
      await modal.button('Remove').click();
    });

    await test.step('Collection leaves the sidebar and its file is unchanged', async () => {
      await expect(toast.byMessage('Collection removed from workspace')).toBeVisible();
      await expect(modal.byTitle('Remove Collection')).toBeHidden();
      await expect(sidebar.collection(collectionName)).toHaveCount(0);
      expect(fs.readFileSync(collectionFile, 'utf-8')).toBe(originalContent);
    });
  });
});
