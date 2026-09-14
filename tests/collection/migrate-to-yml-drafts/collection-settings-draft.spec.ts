import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  openCollectionSettings,
  selectCollectionPaneTab,
  editCodeMirrorEditor,
  openMigrateToYmlModalFromOverview,
  openMigrateDraftsStep,
  saveAllDraftsAndMigrate
} from '../../utils/page';

const firstDirIn = (dir: string) =>
  path.join(dir, fs.readdirSync(dir).find((entry) => fs.statSync(path.join(dir, entry)).isDirectory())!);

test.describe('Migrate to YML — collection-settings draft is persisted before migration', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('saving a collection-settings draft in the drafts step preserves the change on disk after migration', async ({ page, createTmpDir }) => {
    const loc = buildCommonLocators(page);
    const parentDir = await createTmpDir('migrate-drafts-collection-settings');
    const collectionName = 'migrate-drafts-collsettings';
    const markerScript = 'bru.setVar(\'collectionMigrationMarker\', \'draft-survives-migrate\');';

    await test.step('Create a bru collection with one saved request', async () => {
      await createCollection(page, collectionName, parentDir, 'bru');
      await createRequest(page, 'ping', collectionName, { method: 'GET', url: 'http://localhost:8081/ping' });
    });

    await test.step('Leave an unsaved pre-request script on the collection', async () => {
      await openCollectionSettings(page, collectionName, { persist: true });
      await selectCollectionPaneTab(page, 'script');
      await loc.paneTabs.tabTrigger('pre-request').click();
      await editCodeMirrorEditor(page, 'collection-pre-request-script-editor', markerScript);
      await expect(loc.tabs.tabDraftIndicator(loc.tabs.collectionSettingsTab())).toBeVisible();
    });

    await test.step('Open the migrate modal from the overview tab', async () => {
      await openMigrateToYmlModalFromOverview(page, collectionName);
    });

    await test.step('Migrate button routes to the drafts step; save resolves it and starts migration', async () => {
      await openMigrateDraftsStep(page);
      await saveAllDraftsAndMigrate(page);
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });

    await test.step('opencollection.yml contains the pre-request marker (proves save finished before migrate)', async () => {
      const collectionDir = firstDirIn(parentDir);
      const yml = fs.readFileSync(path.join(collectionDir, 'opencollection.yml'), 'utf8');
      expect(yml).toContain('collectionMigrationMarker');
      expect(yml).toContain('draft-survives-migrate');
    });
  });
});
