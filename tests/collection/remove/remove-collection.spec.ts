import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, removeCollection, waitForReadyPage } from '../../utils/page';

const COLLECTION_NAME = 'remove-test-collection';

test.describe('Remove collection', () => {
  test('TC-2614: should remove a collection from the sidebar without deleting its files', { tag: '@sanity' }, async ({ launchElectronApp, collectionFixturePath }) => {
    const collectionPath = collectionFixturePath!;
    const collectionFile = path.join(collectionPath, 'opencollection.yml');
    const originalContent = fs.readFileSync(collectionFile, 'utf-8');

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath }
    });
    const page = await waitForReadyPage(app);
    const { sidebar, toast } = buildCommonLocators(page);

    await test.step('Fixture collection is open in the sidebar', async () => {
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await removeCollection(page, COLLECTION_NAME);

    await test.step('Collection leaves the sidebar and its files are untouched', async () => {
      await expect(toast.byMessage('Collection removed from workspace')).toBeVisible();
      await expect(sidebar.collection(COLLECTION_NAME)).toHaveCount(0);
      expect(fs.existsSync(collectionPath)).toBe(true);
      expect(fs.readFileSync(collectionFile, 'utf-8')).toBe(originalContent);
    });

    await closeElectronApp(app);
  });
});
