import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { readSnapshot, getSnapshotPath, findSnapshotCollectionEntry } from '../utils/snapshot';

const seedSnapshotWithDuplicateCollection = (userDataPath: string, collectionPath: string) => {
  fs.writeFileSync(
    getSnapshotPath(userDataPath),
    JSON.stringify(
      {
        version: '0.0.1',
        activeWorkspacePath: null,
        extras: {
          devTools: {
            open: false
          }
        },
        workspaces: [],
        collections: [
          // Older entry: has a selected environment and an open tab, but is not marked open/mounted.
          {
            pathname: collectionPath,
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
              value: path.join(collectionPath, 'ReqAlpha.bru')
            },
            tabs: [
              {
                type: 'http-request',
                accessor: 'pathname',
                pathname: path.join(collectionPath, 'ReqAlpha.bru'),
                permanent: true
              }
            ]
          },
          // Newer entry: same pathname, marks the collection open/mounted but omits the environment/tabs
          // that the older entry had set. The newer entry should win on the fields it specifies,
          // while fields it leaves unspecified should fall back to the older entry.
          {
            pathname: collectionPath,
            workspacePathname: '',
            isOpen: true,
            isMounted: true
          }
        ]
      },
      null,
      2
    )
  );
};

test.describe('Snapshot: Collection Deduplication', () => {
  test('duplicate collection entries for the same pathname are deduplicated, with the latest entry taking precedence', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-collection-dedup');
    const colPath = await createTmpDir('col');

    fs.writeFileSync(path.join(colPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'TestCol', type: 'collection' }, null, 2));

    seedSnapshotWithDuplicateCollection(userDataPath, colPath);

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
});
