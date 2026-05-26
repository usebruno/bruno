import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  createCollection,
  createEnvironment,
  openCollection,
  selectEnvironment,
  waitForReadyPage
} from '../../utils/page';

const readSnapshot = (userDataPath: string) => {
  const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
};

const legacyPromptVariablesInitUserDataPath = path.join(
  __dirname,
  'init-user-data'
);

const migrationCollectionPath = path.join(
  __dirname,
  'fixtures/collection'
);

test.describe('Snapshot: Collection Environment Persistence', () => {
  test('migrates legacy snapshot format and preserves selected collection environment', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-legacy-env-migration');

    const app = await launchElectronApp({
      initUserDataPath: legacyPromptVariablesInitUserDataPath,
      userDataPath
    });
    const page = await waitForReadyPage(app);

    await test.step('Verify legacy selected environment is hydrated in UI', async () => {
      await openCollection(page, 'migration-collection');
      await expect(page.locator('.current-environment')).toContainText('local');
    });

    await test.step('Close app and verify snapshot migrated to new shape', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      const snapshot = readSnapshot(userDataPath);
      expect(snapshot).not.toBeNull();
      expect(snapshot).toHaveProperty('version');
      expect(snapshot).toHaveProperty('activeWorkspacePath');
      expect(snapshot).toHaveProperty('extras');
      expect(snapshot).toHaveProperty('workspaces');
      expect(snapshot).toHaveProperty('collections');
      expect(Array.isArray(snapshot?.workspaces)).toBe(true);
      expect(Array.isArray(snapshot?.collections)).toBe(true);

      const migratedCollectionEntry = snapshot?.collections?.find(
        (collection: any) => collection?.pathname === migrationCollectionPath
      );
      expect(migratedCollectionEntry).toBeTruthy();
      console.log(JSON.stringify(migratedCollectionEntry));

      expect(migratedCollectionEntry?.selectedEnvironment).toBe('local');
    });
  });

  test('keeps selected environments for non-active collections across snapshot saves', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-env-persistence');
    const firstCollectionPath = await createTmpDir('snap-col-a');
    const secondCollectionPath = await createTmpDir('snap-col-b');
    const firstCollectionRoot = path.join(firstCollectionPath, 'Collection A');
    const secondCollectionRoot = path.join(secondCollectionPath, 'Collection B');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create two collections with distinct selected environments', async () => {
      await createCollection(page, 'Collection A', firstCollectionPath);
      await openCollection(page, 'Collection A');
      await createEnvironment(page, 'local-a', 'collection');
      await selectEnvironment(page, 'local-a', 'collection');

      await createCollection(page, 'Collection B', secondCollectionPath);
      await openCollection(page, 'Collection B');
      await createEnvironment(page, 'local-b', 'collection');
      await selectEnvironment(page, 'local-b', 'collection');
    });

    await test.step('Switch back to first collection and verify environment did not drift', async () => {
      await openCollection(page, 'Collection A');
      await expect(page.locator('.current-environment')).toContainText('local-a');
      await openCollection(page, 'Collection B');
      await expect(page.locator('.current-environment')).toContainText('local-b');
    });

    await test.step('Close app and assert snapshot stores both environments', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      const snapshot = readSnapshot(userDataPath);
      expect(snapshot).not.toBeNull();

      const collections = Array.isArray(snapshot?.collections) ? snapshot.collections : [];
      const firstEntry = collections.find((collection: any) => collection?.pathname === firstCollectionRoot);
      const secondEntry = collections.find((collection: any) => collection?.pathname === secondCollectionRoot);

      expect(firstEntry?.selectedEnvironment).toBe('local-a');
      expect(secondEntry?.selectedEnvironment).toBe('local-b');
      expect(firstEntry?.environmentPath).toContain(path.join('environments', 'local-a'));
      expect(secondEntry?.environmentPath).toContain(path.join('environments', 'local-b'));
    });

    await test.step('Restart app and verify both selections are still restored', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await openCollection(page2, 'Collection A');
      await expect(page2.locator('.current-environment')).toContainText('local-a');

      await openCollection(page2, 'Collection B');
      await expect(page2.locator('.current-environment')).toContainText('local-b');

      await closeElectronApp(app2);
    });
  });

  test('keeps selected environments for three collections across delayed switches and snapshot updates', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-env-persistence-three');
    const firstCollectionPath = await createTmpDir('snap-col-a-three');
    const secondCollectionPath = await createTmpDir('snap-col-b-three');
    const thirdCollectionPath = await createTmpDir('snap-col-c-three');
    const firstCollectionRoot = path.join(firstCollectionPath, 'Collection A');
    const secondCollectionRoot = path.join(secondCollectionPath, 'Collection B');
    const thirdCollectionRoot = path.join(thirdCollectionPath, 'Collection C');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create three collections with distinct selected environments', async () => {
      await createCollection(page, 'Collection A', firstCollectionPath);
      await openCollection(page, 'Collection A');
      await createEnvironment(page, 'local-a', 'collection');
      await selectEnvironment(page, 'local-a', 'collection');

      await createCollection(page, 'Collection B', secondCollectionPath);
      await openCollection(page, 'Collection B');
      await createEnvironment(page, 'local-b', 'collection');
      await selectEnvironment(page, 'local-b', 'collection');

      await createCollection(page, 'Collection C', thirdCollectionPath);
      await openCollection(page, 'Collection C');
      await createEnvironment(page, 'local-c', 'collection');
      await selectEnvironment(page, 'local-c', 'collection');
    });

    await test.step('Switch to each collection with delays and verify selected environment stays correct', async () => {
      await openCollection(page, 'Collection A');
      await expect(page.locator('.current-environment')).toContainText('local-a');

      await openCollection(page, 'Collection B');
      await expect(page.locator('.current-environment')).toContainText('local-b');

      await openCollection(page, 'Collection C');
      await expect(page.locator('.current-environment')).toContainText('local-c');
    });

    await test.step('Close app and assert snapshot stores all three environments', async () => {
      await closeElectronApp(app);

      const snapshot = readSnapshot(userDataPath);
      expect(snapshot).not.toBeNull();

      const collections = Array.isArray(snapshot?.collections) ? snapshot.collections : [];
      const firstEntry = collections.find((collection: any) => collection?.pathname === firstCollectionRoot);
      const secondEntry = collections.find((collection: any) => collection?.pathname === secondCollectionRoot);
      const thirdEntry = collections.find((collection: any) => collection?.pathname === thirdCollectionRoot);

      expect(firstEntry?.selectedEnvironment).toBe('local-a');
      expect(secondEntry?.selectedEnvironment).toBe('local-b');
      expect(thirdEntry?.selectedEnvironment).toBe('local-c');
      expect(firstEntry?.environmentPath).toContain(path.join('environments', 'local-a'));
      expect(secondEntry?.environmentPath).toContain(path.join('environments', 'local-b'));
      expect(thirdEntry?.environmentPath).toContain(path.join('environments', 'local-c'));
    });

    await test.step('Restart app, switch through collections with delays, and verify all selections are restored', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await openCollection(page2, 'Collection A');
      await expect(page2.locator('.current-environment')).toContainText('local-a');
      await page2.waitForTimeout(2000);

      await openCollection(page2, 'Collection B');
      await expect(page2.locator('.current-environment')).toContainText('local-b');
      await page2.waitForTimeout(2000);

      await openCollection(page2, 'Collection C');
      await expect(page2.locator('.current-environment')).toContainText('local-c');
      await page2.waitForTimeout(2000);

      await closeElectronApp(app2);

      const updatedSnapshot = readSnapshot(userDataPath);
      expect(updatedSnapshot).not.toBeNull();

      const updatedCollections = Array.isArray(updatedSnapshot?.collections) ? updatedSnapshot.collections : [];
      const firstUpdatedEntry = updatedCollections.find((collection: any) => collection?.pathname === firstCollectionRoot);
      const secondUpdatedEntry = updatedCollections.find((collection: any) => collection?.pathname === secondCollectionRoot);
      const thirdUpdatedEntry = updatedCollections.find((collection: any) => collection?.pathname === thirdCollectionRoot);

      expect(firstUpdatedEntry?.selectedEnvironment).toBe('local-a');
      expect(secondUpdatedEntry?.selectedEnvironment).toBe('local-b');
      expect(thirdUpdatedEntry?.selectedEnvironment).toBe('local-c');
    });
  });
});
