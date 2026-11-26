import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  selectEnvironment,
  openRequest,
  openWorkspaceFromDialog
} from '../../../pages';
import { findSnapshotCollectionEntry, initBruCollection, readSnapshot, waitForReadyPage, writeBruRequest } from '../../../utils';

const buildWorkspaceYml = (workspaceName: string, collectionPath: string) => [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${workspaceName}`,
  '  type: workspace',
  'collections:',
  '  - name: SharedCol',
  `    path: ${collectionPath.replace(/\\/g, '/')}`,
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

test.describe('Snapshot: Shared collection across workspaces restores its own environment', () => {
  test('two workspaces sharing a collection each restore their own selected environment', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    // This scenario launches Electron twice and switches between workspaces on each launch.
    if (process.platform === 'win32') {
      test.setTimeout(45_000);
    }

    const userDataPath = await createTmpDir('snap-shared-col-env-userdata');
    const workspaceAPath = await createTmpDir('snap-shared-col-env-ws-a');
    const workspaceBPath = await createTmpDir('snap-shared-col-env-ws-b');
    const sharedCollectionPath = await createTmpDir('snap-shared-col-env-collection');

    initBruCollection(sharedCollectionPath, 'SharedCol');
    writeBruRequest(sharedCollectionPath, 'PingA', { seq: 1 });
    const environmentsPath = path.join(sharedCollectionPath, 'environments');
    fs.mkdirSync(environmentsPath);
    for (const name of ['env-a', 'env-b']) {
      fs.writeFileSync(path.join(environmentsPath, `${name}.bru`), 'vars {\n}\n');
    }
    fs.writeFileSync(path.join(workspaceAPath, 'workspace.yml'), buildWorkspaceYml('Workspace A', sharedCollectionPath));
    fs.writeFileSync(path.join(workspaceBPath, 'workspace.yml'), buildWorkspaceYml('Workspace B', sharedCollectionPath));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Open Workspace A and select env-a', async () => {
      await openWorkspaceFromDialog(app, page, workspaceAPath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Workspace A', { timeout: 10000 });
      await openRequest(page, 'SharedCol', 'PingA', { persist: true });

      await selectEnvironment(page, 'env-a');
      await expect(page.locator('.current-environment')).toContainText('env-a');
    });

    await test.step('Open Workspace B, select env-b for the same shared collection', async () => {
      await openWorkspaceFromDialog(app, page, workspaceBPath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Workspace B', { timeout: 10000 });
      await openRequest(page, 'SharedCol', 'PingA');

      await selectEnvironment(page, 'env-b');
      await expect(page.locator('.current-environment')).toContainText('env-b');
    });

    await test.step('Switch back to Workspace A and verify env-a is still selected', async () => {
      await page.getByTestId('workspace-menu').click();
      await page.locator('.workspace-item').filter({ hasText: 'Workspace A' }).click();
      await expect(page.getByTestId('workspace-name')).toHaveText('Workspace A', { timeout: 10000 });

      await openRequest(page, 'SharedCol', 'PingA');
      await expect(page.locator('.current-environment')).toContainText('env-a', { timeout: 10000 });
    });

    await test.step('Switch to Workspace B again and verify env-b is still selected', async () => {
      await page.getByTestId('workspace-menu').click();
      await page.locator('.workspace-item').filter({ hasText: 'Workspace B' }).click();
      await expect(page.getByTestId('workspace-name')).toHaveText('Workspace B', { timeout: 10000 });

      await openRequest(page, 'SharedCol', 'PingA');
      await expect(page.locator('.current-environment')).toContainText('env-b', { timeout: 10000 });
    });

    await test.step('Close and relaunch app: both workspaces still restore their own environment', async () => {
      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return [
          path.normalize(snapshot?.activeWorkspacePath ?? ''),
          findSnapshotCollectionEntry(snapshot, sharedCollectionPath, workspaceAPath)?.selectedEnvironment,
          findSnapshotCollectionEntry(snapshot, sharedCollectionPath, workspaceBPath)?.selectedEnvironment
        ];
      }).toEqual([path.normalize(workspaceBPath), 'env-a', 'env-b']);
      await closeElectronApp(app);

      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await expect(page2.getByTestId('workspace-name')).toHaveText('Workspace B', { timeout: 10000 });
      await openRequest(page2, 'SharedCol', 'PingA');
      await expect(page2.locator('.current-environment')).toContainText('env-b', { timeout: 10000 });

      await page2.getByTestId('workspace-menu').click();
      await page2.locator('.workspace-item').filter({ hasText: 'Workspace A' }).click();
      await expect(page2.getByTestId('workspace-name')).toHaveText('Workspace A', { timeout: 10000 });

      await openRequest(page2, 'SharedCol', 'PingA');
      await expect(page2.locator('.current-environment')).toContainText('env-a', { timeout: 10000 });

      await closeElectronApp(app2);
    });
  });
});
