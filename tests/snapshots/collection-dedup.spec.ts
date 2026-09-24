import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { readSnapshot, findSnapshotCollectionEntry, seedSnapshotWithCollections } from '../utils/snapshot';

test.describe('Snapshot: Collection Deduplication', () => {
  test('duplicate collection entries for the same pathname are deduplicated, with the latest entry taking precedence', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-collection-dedup');
    const colPath = await createTmpDir('col');

    fs.writeFileSync(path.join(colPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'TestCol', type: 'collection' }, null, 2));

    seedSnapshotWithCollections(userDataPath, [
      // Older entry: has a selected environment and an open tab, but is not marked open/mounted.
      {
        pathname: colPath,
        workspacePathname: '',
        environment: {
          collection: 'local.yml',
          global: ''
        },
        environmentPath: 'local.yml',
        selectedEnvironment: 'local',
        isOpen: false,
        isMounted: false,
        activeTab: {
          accessor: 'pathname',
          value: path.join(colPath, 'ReqAlpha.bru')
        },
        tabs: [
          {
            type: 'http-request',
            accessor: 'pathname',
            pathname: path.join(colPath, 'ReqAlpha.bru'),
            permanent: true
          }
        ]
      },
      // Newer entry: same pathname, marks the collection open/mounted but omits the environment/tabs
      // that the older entry had set. The newer entry should win on the fields it specifies,
      // while fields it leaves unspecified should fall back to the older entry.
      {
        pathname: colPath,
        workspacePathname: '',
        isOpen: true,
        isMounted: true
      }
    ]);

    await test.step('Assert seeded snapshot has two entries for the same collection before launch', () => {
      const snapshot = readSnapshot(userDataPath);
      const entries = snapshot.collections.filter((c: any) => path.normalize(c.pathname) === path.normalize(colPath));
      expect(entries).toHaveLength(2);
    });

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await expect(page.getByTestId('workspace-name')).toBeVisible({ timeout: 10000 });

    await test.step('Close app and verify the snapshot is deduplicated to a single, merged entry', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      const snapshot = readSnapshot(userDataPath);
      const entries = snapshot.collections.filter((c: any) => path.normalize(c.pathname) === path.normalize(colPath));
      expect(entries).toHaveLength(1);

      const entry = findSnapshotCollectionEntry(snapshot, colPath);

      // Fields set by the newer entry win.
      expect(entry.isOpen).toBe(true);
      expect(entry.isMounted).toBe(true);

      // Fields not touched by the newer entry are preserved from the older entry.
      expect(entry.selectedEnvironment).toBe('local');
      expect(entry.environment.collection).toBe('local.yml');
      expect(entry.tabs).toHaveLength(1);
      expect(entry.tabs[0].pathname).toBe(path.join(colPath, 'ReqAlpha.bru'));
    });
  });

  test('collection entries with the same pathname but different workspacePathname are not deduplicated', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-collection-dedup-diff-workspace');
    const colPath = await createTmpDir('col');
    const workspaceAPath = await createTmpDir('workspace-a');
    const workspaceBPath = await createTmpDir('workspace-b');

    fs.writeFileSync(path.join(colPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'TestCol', type: 'collection' }, null, 2));

    seedSnapshotWithCollections(
      userDataPath,
      [
        // Same collection pathname, but scoped to workspace A.
        {
          pathname: colPath,
          workspacePathname: workspaceAPath,
          isOpen: true,
          isMounted: true
        },
        // Same collection pathname, but scoped to workspace B. Distinct entry since the
        // workspacePathname differs - it should NOT be merged/removed by dedup.
        {
          pathname: colPath,
          workspacePathname: workspaceBPath,
          isOpen: false,
          isMounted: false
        }
      ],
      { workspaces: [{ pathname: workspaceAPath }, { pathname: workspaceBPath }] }
    );

    await test.step('Assert seeded snapshot has two entries for the same collection pathname before launch', () => {
      const snapshot = readSnapshot(userDataPath);
      const entries = snapshot.collections.filter((c: any) => path.normalize(c.pathname) === path.normalize(colPath));
      expect(entries).toHaveLength(2);
    });

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await expect(page.getByTestId('workspace-name')).toBeVisible({ timeout: 10000 });

    await test.step('Close app and verify both workspace-scoped entries are preserved', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      const snapshot = readSnapshot(userDataPath);
      const entries = snapshot.collections.filter((c: any) => path.normalize(c.pathname) === path.normalize(colPath));
      expect(entries).toHaveLength(2);

      const entryA = findSnapshotCollectionEntry(snapshot, colPath, workspaceAPath);
      const entryB = findSnapshotCollectionEntry(snapshot, colPath, workspaceBPath);

      expect(entryA).not.toBeNull();
      expect(entryB).not.toBeNull();
      expect(entryA.isOpen).toBe(true);
      expect(entryB.isOpen).toBe(false);
    });
  });
});
