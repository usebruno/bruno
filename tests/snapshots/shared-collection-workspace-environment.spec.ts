import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  createRequest,
  createEnvironment,
  selectEnvironment,
  openRequest,
  openWorkspaceFromDialog,
  waitForReadyPage,
  openCollection
} from '../utils/page';

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
    const userDataPath = await createTmpDir('snap-shared-col-env-userdata');
    const workspaceAPath = await createTmpDir('snap-shared-col-env-ws-a');
    const workspaceBPath = await createTmpDir('snap-shared-col-env-ws-b');
    const sharedCollectionPath = await createTmpDir('snap-shared-col-env-collection');

    fs.writeFileSync(path.join(sharedCollectionPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'SharedCol', type: 'collection' }, null, 2));
    fs.writeFileSync(path.join(workspaceAPath, 'workspace.yml'), buildWorkspaceYml('Workspace A', sharedCollectionPath));
    fs.writeFileSync(path.join(workspaceBPath, 'workspace.yml'), buildWorkspaceYml('Workspace B', sharedCollectionPath));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Open Workspace A, create request, and select env-a', async () => {
      await openWorkspaceFromDialog(app, page, workspaceAPath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Workspace A', { timeout: 10000 });
      await openCollection(page, 'SharedCol');
      await createRequest(page, 'PingA', 'SharedCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'SharedCol', 'PingA', { persist: true });

      await createEnvironment(page, 'env-a');
      await selectEnvironment(page, 'env-a');
      await expect(page.locator('.current-environment')).toContainText('env-a');
    });

    await test.step('Open Workspace B, select env-b for the same shared collection', async () => {
      await openWorkspaceFromDialog(app, page, workspaceBPath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Workspace B', { timeout: 10000 });
      await openCollection(page, 'SharedCol');
      await openRequest(page, 'SharedCol', 'PingA');

      await createEnvironment(page, 'env-b');
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
      await page.waitForTimeout(2000);
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
