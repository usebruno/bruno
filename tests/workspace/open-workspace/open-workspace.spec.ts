import path from 'path';
import fs from 'fs';
import type { ElectronApplication } from '@playwright/test';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, openWorkspaceFromDialog, waitForReadyPage } from '../../utils/page';

const buildWorkspaceYml = (workspaceName: string) => [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${workspaceName}`,
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

test.describe('Open Workspace', () => {
  test.describe('canceling the open workspace dialog should not show a success toast', () => {
    test('click on cancel button, should just close the dialog', async ({
      launchElectronApp,
      createTmpDir
    }) => {
      const userDataPath = await createTmpDir('open-workspace-cancel');

      let app: ElectronApplication | undefined;
      try {
        app = await launchElectronApp({ userDataPath });
        const page = await waitForReadyPage(app);
        const locators = buildCommonLocators(page);

        const initialWorkspaceName = await page
          .getByTestId('workspace-name')
          .textContent();

        await app!.evaluate(({ dialog }) => {
          (
            dialog as { showOpenDialog: typeof dialog.showOpenDialog }
          ).showOpenDialog = () =>
            Promise.resolve({ canceled: true, filePaths: [] });
        });

        await test.step('Open the workspace menu and click "Open workspace"', async () => {
          await page.getByTestId('workspace-menu').click();
          await locators.dropdown.item('Open workspace').click();
        });

        await test.step('No success toast appears within 5s, workspace unchanged', async () => {
          const toast = page.getByText('Workspace opened successfully');
          const deadline = Date.now() + 5000;
          while (Date.now() < deadline) {
            await expect(toast).toBeHidden({ timeout: 100 });
            await page.waitForTimeout(100);
          }
          await expect(page.getByTestId('workspace-name')).toHaveText(initialWorkspaceName ?? '');
        });
      } finally {
        if (app) await closeElectronApp(app);
      }
    });
  });

  test.describe('successfully opening a workspace should show a success toast', () => {
    test('selecting a valid workspace path shows the success toast', async ({
      launchElectronApp,
      createTmpDir
    }) => {
      const userDataPath = await createTmpDir('open-workspace-success');
      const workspacePath = await createTmpDir('demo-workspace');

      fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml('Demo Workspace'));

      let app: ElectronApplication | undefined;
      try {
        app = await launchElectronApp({ userDataPath });
        const page = await waitForReadyPage(app);

        await test.step('Open the demo workspace via the dialog', async () => {
          await openWorkspaceFromDialog(app, page, workspacePath);
        });

        await test.step('Success toast appears within 5s and workspace switches', async () => {
          const toast = page.getByText('Workspace opened successfully');
          const deadline = Date.now() + 5000;
          let toastSeen = false;
          while (Date.now() < deadline) {
            if (await toast.isVisible()) {
              toastSeen = true;
              break;
            }
            await page.waitForTimeout(100);
          }
          expect(toastSeen).toBe(true);
          await expect(page.getByTestId('workspace-name')).toHaveText('Demo Workspace', { timeout: 10000 });
        });
      } finally {
        if (app) await closeElectronApp(app);
      }
    });
  });
});
