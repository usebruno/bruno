import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { createCollection, waitForReadyPage } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const WORKSPACE_YML_WORKSPACEB = [
  'opencollection: 1.0.0',
  'info:',
  '  name: WorkspaceB',
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

test.describe('Close workspace returns to default workspace (BRU-3663)', () => {
  test('closing the active workspace shows "My Workspace" (not "Scratch") and restores its collections', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('close-workspace-bru3663');
    const colAPath = await createTmpDir('col-a');
    const workspaceBPath = await createTmpDir('workspace-b');
    fs.writeFileSync(path.join(workspaceBPath, 'workspace.yml'), WORKSPACE_YML_WORKSPACEB);

    let app;
    try {
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);
      const switcherName = page.locator('.switcher-name').first();

      await test.step('Default workspace is "My Workspace" with a collection ColA', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
        await createCollection(page, 'ColA', colAPath);
        await expect(locators.sidebar.collection('ColA')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Stub open-dialog and switch to WorkspaceB', async () => {
        await app.evaluate(
          ({ dialog }, targetPath: string) => {
            (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
              Promise.resolve({ canceled: false, filePaths: [targetPath] });
          },
          workspaceBPath
        );
        await page.getByTestId('workspace-menu').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
        await expect(page.getByTestId('workspace-name')).toHaveText('WorkspaceB', { timeout: 10000 });
        await expect(switcherName).toHaveText('WorkspaceB', { timeout: 10000 });
      });

      await test.step('Close WorkspaceB via the workspace-actions ellipsis', async () => {
        await expect(page.locator('.workspace-actions-trigger')).toBeVisible({ timeout: 10000 });
        await page.locator('.workspace-actions-trigger').click();
        await locators.dropdown.item('Close').click();
        await expect(locators.modal.byTitle('Close Workspace')).toBeVisible({ timeout: 5000 });
        await locators.modal.button('Close').click();
      });

      await test.step('App returns to My Workspace, never shows "Scratch", and ColA reloads', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
        await expect(locators.sidebar.collection('ColA')).toBeVisible({ timeout: 10000 });
        await expect(switcherName).not.toHaveText('Scratch');
      });
    } finally {
      if (app) await closeElectronApp(app);
    }
  });
});
