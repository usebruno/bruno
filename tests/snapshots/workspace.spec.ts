import path from 'path';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  waitForReadyPage
} from '../utils/page';
import fs from 'fs';

test.describe('Snapshot: Deleted Workspace Restoration', () => {
  test('', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-workspace-state');
    const workspacePath = await createTmpDir('demo-workspace');
    const defaultCollectionPath = await createTmpDir('default-workspace-col');

    const WORKSPACE_YML = [
      'opencollection: 1.0.0',
      'info:',
      '  name: Demo Workspace',
      '  type: workspace',
      'collections:',
      'specs: []',
      'docs: \'\'',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), WORKSPACE_YML);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create a collection in default workspace and mount it', async () => {
      await createCollection(page, 'Default Workspace Col', defaultCollectionPath);
      await createRequest(page, 'Default Workspace Req', 'Default Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Default Workspace Col', 'Default Workspace Req', { persist: true });
      await expect(page.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Open WorkspaceB and switch to it', async () => {
      await app.evaluate(
        ({ dialog }, targetPath: string) => {
          (dialog as any).showOpenDialog = () =>
            Promise.resolve({ canceled: false, filePaths: [targetPath] });
        },
        workspacePath
      );
      await page.getByTestId('workspace-menu').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
      await expect(page.getByTestId('workspace-name')).toHaveText('Demo Workspace', { timeout: 10000 });
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Open after deleting workspace', async () => {
      await fs.promises.rm(workspacePath, { force: true, recursive: true });
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);
      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
      await expect(page2.getByTestId('sidebar-collection-row').filter({ hasText: 'Default Workspace Col' })).toBeVisible({ timeout: 10000 });
      await openRequest(page2, 'Default Workspace Col', 'Default Workspace Req');
      await expect(page2.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });

      await page2.getByTestId('workspace-menu').click();
      await expect(page2.locator('.workspace-item.active')).toContainText('My Workspace');
      await expect(page2.locator('.workspace-item').filter({ hasText: 'Demo Workspace' })).toHaveCount(0);
      await closeElectronApp(app2);
    });
  });
});
