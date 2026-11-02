import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createTransientRequest,
  fillRequestUrl,
  openMigrateToYmlModalFromOverview,
  openMigrateDraftsStep,
  saveAllDraftsAndMigrate
} from '../../utils/page';

const firstDirIn = (dir: string) =>
  path.join(dir, fs.readdirSync(dir).find((entry) => fs.statSync(path.join(dir, entry)).isDirectory())!);

test.describe('Migrate to YML — a transient request blocks Save All until it is saved', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('save the transient via its per-item Save button, then Save All completes migration', async ({ page, createTmpDir }) => {
    const loc = buildCommonLocators(page);
    const migrate = loc.migrateToYml;
    const parentDir = await createTmpDir('migrate-drafts-transient');
    const collectionName = 'migrate-drafts-transient';
    const savedName = 'saved-from-transient';

    await createCollection(page, collectionName, parentDir, 'bru');

    let transientName = '';
    await test.step('Create a transient request with a URL so it counts as unsaved', async () => {
      await createTransientRequest(page, { requestType: 'HTTP' });
      transientName = (await loc.tabs.activeRequestTab().locator('.tab-name').innerText()).trim();
      await fillRequestUrl(page, 'http://localhost:8081/transient-migrate');
    });

    await openMigrateToYmlModalFromOverview(page, collectionName);
    await openMigrateDraftsStep(page);

    await test.step('Save All is disabled and the transient row is listed', async () => {
      await expect(migrate.draftsTransientRow(transientName)).toBeVisible();
      await expect(migrate.draftsSaveAll()).toBeDisabled();
    });

    await test.step('Save the transient via its per-item Save button', async () => {
      await migrate.draftsTransientSave(transientName).click();

      const saveTransientModal = page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' });
      await expect(saveTransientModal).toBeVisible({ timeout: 10000 });

      const nameInput = saveTransientModal.locator('#request-name');
      await nameInput.clear();
      await nameInput.fill(savedName);

      await saveTransientModal.getByRole('button', { name: 'Save' }).click();
      await expect(saveTransientModal).toBeHidden({ timeout: 10000 });
      await expect(page.getByText('Request saved successfully').last()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Drafts step now has no transients and Save All is enabled', async () => {
      await expect(migrate.draftsTransientRow(transientName)).toHaveCount(0);
      await expect(migrate.draftsSaveAll()).toBeEnabled();
    });

    await test.step('Save All completes migration', async () => {
      await saveAllDraftsAndMigrate(page);
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });

    await test.step('The saved request survives as a .yml on disk', async () => {
      const collectionDir = firstDirIn(parentDir);
      expect(fs.existsSync(path.join(collectionDir, `${savedName}.yml`))).toBe(true);
    });
  });
});
