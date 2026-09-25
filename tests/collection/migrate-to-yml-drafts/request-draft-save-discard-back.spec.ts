import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  fillRequestUrl,
  openMigrateToYmlModalFromOverview,
  openMigrateDraftsStep,
  saveAllDraftsAndMigrate,
  discardAllDraftsAndMigrate,
  returnFromDraftsStep
} from '../../utils/page';

const firstDirIn = (dir: string) =>
  path.join(dir, fs.readdirSync(dir).find((entry) => fs.statSync(path.join(dir, entry)).isDirectory())!);

const SAVED_URL = 'http://localhost:8081/original';
const EDITED_SUFFIX = '/edited-in-draft';

test.describe.configure({ mode: 'serial' });

test.describe('Migrate to YML — request draft happy paths', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('Save and Migrate persists the edited request into the migrated .yml', async ({ page, createTmpDir }) => {
    const loc = buildCommonLocators(page);
    const parentDir = await createTmpDir('migrate-drafts-req-save');
    const collectionName = 'migrate-drafts-req-save';

    await createCollection(page, collectionName, parentDir, 'bru');
    await createRequest(page, 'req', collectionName, { method: 'GET', url: SAVED_URL });
    await loc.sidebar.request('req').click();

    await test.step('Edit the URL without saving so the request is dirty', async () => {
      await fillRequestUrl(page, EDITED_SUFFIX);
      await expect(loc.tabs.tabDraftIndicator(loc.tabs.activeRequestTab())).toBeVisible();
    });

    await test.step('Migrate → drafts step → Save and Migrate', async () => {
      await openMigrateToYmlModalFromOverview(page, collectionName);
      await openMigrateDraftsStep(page);
      await saveAllDraftsAndMigrate(page);
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });

    await test.step('Migrated req.yml contains the edited URL', async () => {
      const collectionDir = firstDirIn(parentDir);
      const yml = fs.readFileSync(path.join(collectionDir, 'req.yml'), 'utf8');
      expect(yml).toContain(EDITED_SUFFIX);
    });
  });

  test('Discard All skips the edit and migrates from the on-disk state', async ({ page, createTmpDir }) => {
    const loc = buildCommonLocators(page);
    const parentDir = await createTmpDir('migrate-drafts-req-discard');
    const collectionName = 'migrate-drafts-req-discard';

    await createCollection(page, collectionName, parentDir, 'bru');
    await createRequest(page, 'req', collectionName, { method: 'GET', url: SAVED_URL });
    await loc.sidebar.request('req').click();
    await fillRequestUrl(page, EDITED_SUFFIX);
    await expect(loc.tabs.tabDraftIndicator(loc.tabs.activeRequestTab())).toBeVisible();

    await test.step('Migrate → drafts step → Discard All', async () => {
      await openMigrateToYmlModalFromOverview(page, collectionName);
      await openMigrateDraftsStep(page);
      await discardAllDraftsAndMigrate(page);
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });

    await test.step('Migrated req.yml keeps the originally saved URL, not the discarded edit', async () => {
      const collectionDir = firstDirIn(parentDir);
      const yml = fs.readFileSync(path.join(collectionDir, 'req.yml'), 'utf8');
      expect(yml).toContain(SAVED_URL);
      expect(yml).not.toContain(EDITED_SUFFIX);
    });
  });

  test('Back returns to the migrate confirmation and leaves the draft intact', async ({ page, createTmpDir }) => {
    const loc = buildCommonLocators(page);
    const migrate = loc.migrateToYml;
    const parentDir = await createTmpDir('migrate-drafts-req-back');
    const collectionName = 'migrate-drafts-req-back';

    await createCollection(page, collectionName, parentDir, 'bru');
    await createRequest(page, 'req', collectionName, { method: 'GET', url: SAVED_URL });
    await loc.sidebar.request('req').click();
    await fillRequestUrl(page, EDITED_SUFFIX);
    await expect(loc.tabs.tabDraftIndicator(loc.tabs.activeRequestTab())).toBeVisible();

    await openMigrateToYmlModalFromOverview(page, collectionName);
    await openMigrateDraftsStep(page);

    await test.step('Back returns to migrate confirm; nothing migrates', async () => {
      await returnFromDraftsStep(page);
      await expect(migrate.modal()).toBeVisible();
      await expect(migrate.migrateButton()).toBeVisible();
    });

    await test.step('Close the migrate modal and confirm the draft is still dirty', async () => {
      await migrate.modal().getByTestId('modal-close-button').click();
      // Focus the request tab (openMigrateToYmlModalFromOverview switched the active tab
      // to Collection Settings), then check its draft indicator.
      await loc.sidebar.request('req').click();
      await expect(loc.tabs.tabDraftIndicator(loc.tabs.activeRequestTab())).toBeVisible();
      const collectionDir = firstDirIn(parentDir);
      // On-disk file still has the pre-edit URL; edit lives only in the draft.
      const bru = fs.readFileSync(path.join(collectionDir, 'req.bru'), 'utf8');
      expect(bru).toContain(SAVED_URL);
      expect(bru).not.toContain(EDITED_SUFFIX);
    });
  });
});
