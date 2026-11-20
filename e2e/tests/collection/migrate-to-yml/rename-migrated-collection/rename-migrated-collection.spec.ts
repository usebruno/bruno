import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  confirmMigration,
  openCollection,
  openMigrateToYmlModalFromOverview,
  renameCollectionFromMenu
} from '../../../../pages';

const COLLECTION_NAME = 'migrate-rename-collection';
const RENAMED_COLLECTION_NAME = 'migrate-rename-collection-renamed';
const REQUEST_NAME = 'ping';

test.describe('Migrate to YML — rename collection after migration', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-5976: Verify after migration user is able to rename the collection', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const collectionPath = collectionFixturePath!;

    await test.step('Precondition: migrate the bru collection to yml', async () => {
      await openCollection(page, COLLECTION_NAME);
      await openMigrateToYmlModalFromOverview(page, COLLECTION_NAME);
      await confirmMigration(page);
      await toast.byMessage('Collection migrated to YML format successfully').waitFor({ state: 'visible' });
    });

    await test.step('Rename the collection from the sidebar actions menu', async () => {
      await renameCollectionFromMenu(page, COLLECTION_NAME, RENAMED_COLLECTION_NAME);
    });

    await test.step('Verify that the collection is renamed in the sidebar and in its yml file', async () => {
      await expect(toast.byMessage('Collection renamed!')).toBeVisible();
      await expect(sidebar.collectionExact(RENAMED_COLLECTION_NAME)).toBeVisible();
      await expect(sidebar.collectionExact(COLLECTION_NAME)).toHaveCount(0);
      await expect.poll(() => fs.readFileSync(path.join(collectionPath, 'opencollection.yml'), 'utf8')).toContain(`name: ${RENAMED_COLLECTION_NAME}`);
      expect(fs.existsSync(path.join(collectionPath, 'bruno.json'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, `${REQUEST_NAME}.yml`))).toBe(true);
    });
  });
});
