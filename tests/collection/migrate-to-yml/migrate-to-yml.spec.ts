import fs from 'fs';
import path from 'path';
import jsyaml from 'js-yaml';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  openCollection,
  openMigrateToYmlModalFromOverview,
  openCollectionOverview,
  confirmMigration,
  selectEnvironment,
  sendRequestAndWaitForResponse
} from '../../utils/page';

test.describe('Migrate collection from bru to yml format', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should migrate bru collection to yml, close its tabs and land on the overview', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const collectionPath = collectionFixturePath!;
    const loc = buildCommonLocators(page);

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

    await test.step('Open collection and open a request as a permanent tab', async () => {
      await openCollection(page, 'migration-test');
      await loc.sidebar.collection('migration-test').click();
      await loc.sidebar.request('ping').dblclick();
      await expect(loc.tabs.requestTab('ping')).toBeVisible();
    });

    await test.step('Verify migration section is visible for bru collection', async () => {
      await openCollectionOverview(page, 'migration-test');
      await expect(page.getByText('Migrate to YML file format')).toBeVisible();
      await expect(loc.migrateToYml.convertButton()).toBeVisible();
    });

    await test.step('Confirm migration from the modal', async () => {
      await openMigrateToYmlModalFromOverview(page, 'migration-test');
      await expect(loc.migrateToYml.modal().getByText('migration-test')).toBeVisible();
      await confirmMigration(page);
    });

    await test.step('Wait for migration to complete', async () => {
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

      const oc = jsyaml.load(ocContent) as { info?: { version?: string } };
      expect(oc.info?.version).toBe('v9.9.9');
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

    await test.step('Collection reappears in the sidebar with its items', async () => {
      await expect(loc.sidebar.collection('migration-test')).toBeVisible({ timeout: 15000 });
      await expect(loc.sidebar.request('ping')).toBeVisible({ timeout: 15000 });
      await expect(loc.sidebar.request('post-json')).toBeVisible();
      await expect(loc.sidebar.request('api')).toBeVisible();
    });

    await test.step('Previously open request tab is closed and the overview tab is open', async () => {
      await expect(loc.tabs.requestTab('ping')).toHaveCount(0);
      await expect(loc.tabs.collectionSettingsTab()).toBeVisible();
      await expect(loc.paneTabs.collectionSettingsTab('overview')).toBeVisible();
    });

    await test.step('Verify migration section is hidden after migration', async () => {
      await loc.paneTabs.collectionSettingsTab('overview').click();
      await expect(page.getByText('Migrate to YML file format')).not.toBeVisible();
    });

    await test.step('Verify migrated requests are functional', async () => {
      await selectEnvironment(page, 'Local');
      await loc.sidebar.request('ping').click();
      await sendRequestAndWaitForResponse(page, 200);
    });

    // Verify no uncaught JS errors occurred during migration
    expect(pageErrors).toHaveLength(0);
  });
});
