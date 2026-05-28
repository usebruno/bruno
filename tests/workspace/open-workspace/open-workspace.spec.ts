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

        await test.step('Workspace unchanged after canceling the dialog', async () => {
          await expect(page.getByTestId('workspace-name')).toHaveText(initialWorkspaceName ?? '');
        });
      } finally {
        if (app) await closeElectronApp(app);
      }
    });
  });
});
