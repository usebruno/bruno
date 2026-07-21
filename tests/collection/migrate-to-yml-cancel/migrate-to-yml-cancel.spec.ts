import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  waitForReadyPage,
  openCollection,
  openMigrateToYmlModalFromOverview,
  confirmMigration
} from '../../utils/page';

const listFilesRecursive = (dir: string): string[] => {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(entryPath));
    } else {
      results.push(entryPath);
    }
  }
  return results.sort();
};

test.describe('Cancelling a bru to yml migration restores the collection', () => {
  test('cancel mid-migration leaves the bru collection exactly as it was', async ({ launchElectronApp, collectionFixturePath }) => {
    const collectionPath = collectionFixturePath!;

    // The migration pipeline honors this per-file delay so the parsing phase is slow
    // enough (8 files ≈ 2s) to cancel deterministically from the ui.
    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath },
      dotEnv: { BRUNO_MIGRATE_TO_YML_FILE_DELAY_MS: '250' }
    });
    const page = await waitForReadyPage(app);
    const loc = buildCommonLocators(page);

    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    const filesBefore = listFilesRecursive(collectionPath);

    await test.step('Open the collection and start the migration', async () => {
      await openCollection(page, 'migration-test');
      await openMigrateToYmlModalFromOverview(page, 'migration-test');
      await confirmMigration(page);
    });

    await test.step('While migrating: collection is gone from the sidebar, locked modal shows progress', async () => {
      await expect(loc.migrateToYml.progress()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'migration-test' })).not.toBeVisible();
    });

    await test.step('Cancel the migration', async () => {
      await loc.migrateToYml.cancelMigrationButton().click();
      await expect(page.getByText('Migration cancelled')).toBeVisible({ timeout: 30000 });
    });

    await test.step('Disk is restored exactly: all bru files back, no yml residue', async () => {
      await expect
        .poll(() => listFilesRecursive(collectionPath), { timeout: 10000 })
        .toEqual(filesBefore);
      expect(fs.existsSync(path.join(collectionPath, 'opencollection.yml'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'bruno.json'))).toBe(true);
    });

    await test.step('Collection reopens in bru form and still offers the migration', async () => {
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'migration-test' })).toBeVisible({ timeout: 15000 });
      await page.locator('#sidebar-collection-name').filter({ hasText: 'migration-test' }).click();
      await page.getByTestId('collection-settings-tab-overview').click();
      await expect(loc.migrateToYml.convertButton()).toBeVisible({ timeout: 15000 });
    });

    expect(pageErrors).toHaveLength(0);

    await app.close();
  });
});
