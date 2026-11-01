import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  openCloneCollectionModal,
  chooseCloneLocation
} from '../../utils/page';

test.describe('Clone collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-119: Verify cloning a collection from the sidebar collection menu', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const collectionName = 'clone-source';
    const cloneName = `${collectionName} copy`;
    const folderName = 'orders';
    const sourceLocation = await createTmpDir('clone-source');
    const cloneLocation = await createTmpDir('clone-dest');
    const { modal, sidebar, toast } = buildCommonLocators(page);
    const cloneModal = modal.byTitle('Clone Collection');

    await test.step('Create a collection with a folder', async () => {
      await createCollection(page, collectionName, sourceLocation, 'yml');
      await createFolder(page, folderName, collectionName);
      await expect(sidebar.scopedItem(collectionName, folderName)).toBeVisible();
    });

    await test.step('Open clone from the collection ellipse menu', async () => {
      await openCloneCollectionModal(page, collectionName);
      await expect(cloneModal).toBeVisible();
      await expect(sidebar.cloneCollectionModal.nameInput()).toHaveValue(cloneName);
    });

    await test.step('Clone the collection into a new location', async () => {
      await chooseCloneLocation(page, electronApp, cloneLocation);
      await expect(sidebar.cloneCollectionModal.locationInput()).toHaveValue(cloneLocation);
      await cloneModal.getByRole('button', { name: 'Create', exact: true }).click();
      await expect(cloneModal).toHaveCount(0);
    });

    await test.step('Collection created toast is shown', async () => {
      await expect(toast.byMessage('Collection created!').first()).toBeVisible();
    });

    await test.step('Cloned collection is listed in the sidebar', async () => {
      await expect(sidebar.collection(cloneName)).toBeVisible();
      await expect(sidebar.collectionsContainer().getByTitle(collectionName, { exact: true })).toBeVisible();
    });

    await test.step('Clone is written to disk and includes the source folder', async () => {
      const cloneDir = path.join(cloneLocation, cloneName);
      const configPath = path.join(cloneDir, 'opencollection.yml');
      const folderFilePath = path.join(cloneDir, folderName, 'folder.yml');

      expect(fs.readFileSync(configPath, 'utf8')).toContain(`name: ${cloneName}`);
      expect(fs.existsSync(folderFilePath)).toBe(true);
    });
  });
});
