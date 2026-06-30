import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection, selectEnvironment, sendRequestAndWaitForResponse } from '../../utils/page';

test.describe('Migrate collection from bru to yml format', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should migrate bru collection to yml and preserve all data', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const collectionPath = collectionFixturePath!;

    // Capture any uncaught errors during migration
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await test.step('Verify collection is in bru format before migration', async () => {
      expect(fs.existsSync(path.join(collectionPath, 'bruno.json'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'collection.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'ping.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'post-json.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'api', 'folder.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'api', 'get-users.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'environments', 'Local.bru'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'environments', 'Production.bru'))).toBe(true);
    });

    await test.step('Open collection and navigate to overview', async () => {
      await openCollection(page, 'migration-test');
      await page.locator('#sidebar-collection-name').filter({ hasText: 'migration-test' }).click();
      await page.getByTestId('collection-settings-tab-overview').click();
    });

    await test.step('Verify migration section is visible for bru collection', async () => {
      await expect(page.getByText('Migrate to YML file format')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Convert to YML' })).toBeVisible();
    });

    await test.step('Click Convert to YML and confirm migration', async () => {
      await page.getByRole('button', { name: 'Convert to YML' }).click();

      // Confirmation modal should appear
      const modal = page.locator('.bruno-modal').filter({ hasText: 'Migrate to YML format' });
      await modal.waitFor({ state: 'visible', timeout: 5000 });

      // Verify modal content mentions the collection name
      await expect(modal.getByText('migration-test')).toBeVisible();

      // Confirm migration
      await modal.getByRole('button', { name: 'Migrate' }).click();
    });

    await test.step('Wait for migration to complete and collection to reload', async () => {
      // Wait for success toast
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });

    await test.step('Verify all bru files are removed from disk', async () => {
      expect(fs.existsSync(path.join(collectionPath, 'bruno.json'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'collection.bru'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'ping.bru'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'post-json.bru'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'api', 'folder.bru'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'api', 'get-users.bru'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'environments', 'Local.bru'))).toBe(false);
      expect(fs.existsSync(path.join(collectionPath, 'environments', 'Production.bru'))).toBe(false);
    });

    await test.step('Verify all yml files are created on disk', async () => {
      expect(fs.existsSync(path.join(collectionPath, 'opencollection.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'ping.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'post-json.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'api', 'folder.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'api', 'get-users.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'environments', 'Local.yml'))).toBe(true);
      expect(fs.existsSync(path.join(collectionPath, 'environments', 'Production.yml'))).toBe(true);
    });

    await test.step('Verify opencollection.yml has correct config', async () => {
      const ocContent = fs.readFileSync(path.join(collectionPath, 'opencollection.yml'), 'utf8');
      expect(ocContent).toContain('opencollection');
      expect(ocContent).toContain('migration-test');
    });

    await test.step('Verify request yml files preserve data', async () => {
      const pingContent = fs.readFileSync(path.join(collectionPath, 'ping.yml'), 'utf8');
      expect(pingContent).toContain('ping');
      expect(pingContent).toContain('/ping');
      expect(pingContent).toContain('GET');

      const postContent = fs.readFileSync(path.join(collectionPath, 'post-json.yml'), 'utf8');
      expect(postContent).toContain('post-json');
      expect(postContent).toContain('POST');
      expect(postContent).toContain('hello from migration test');
    });

    await test.step('Verify folder yml file preserves data', async () => {
      const folderContent = fs.readFileSync(path.join(collectionPath, 'api', 'folder.yml'), 'utf8');
      expect(folderContent).toContain('api');
      expect(folderContent).toContain('X-Folder-Header');
    });

    await test.step('Verify environment yml files preserve data', async () => {
      const localEnvContent = fs.readFileSync(path.join(collectionPath, 'environments', 'Local.yml'), 'utf8');
      expect(localEnvContent).toContain('host');
      expect(localEnvContent).toContain('http://localhost:8081');

      const prodEnvContent = fs.readFileSync(path.join(collectionPath, 'environments', 'Production.yml'), 'utf8');
      expect(prodEnvContent).toContain('host');
      expect(prodEnvContent).toContain('https://api.example.com');
    });

    await test.step('Verify collection items are loaded in sidebar', async () => {
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'migration-test' })).toBeVisible();
      await expect(page.locator('.item-name').filter({ hasText: 'ping' })).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.item-name').filter({ hasText: 'post-json' })).toBeVisible();
      await expect(page.locator('.item-name').filter({ hasText: 'api' })).toBeVisible();
    });

    await test.step('Verify migration section is hidden after migration', async () => {
      await page.getByTestId('collection-settings-tab-overview').click();
      await expect(page.getByText('Migrate to YML file format')).not.toBeVisible();
    });

    await test.step('Verify migrated requests are functional', async () => {
      await selectEnvironment(page, 'Local');
      await page.locator('.item-name').filter({ hasText: 'ping' }).click();
      await sendRequestAndWaitForResponse(page, 200);
    });

    // Verify no uncaught JS errors occurred during migration
    expect(pageErrors).toHaveLength(0);
  });
});
