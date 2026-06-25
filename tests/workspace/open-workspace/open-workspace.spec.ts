import type { ElectronApplication } from '@playwright/test';
import { expect, test } from '../../../playwright';
import { buildCommonLocators, waitForReadyPage } from '../../utils/page';
import fs from 'fs/promises';
import path from 'path';

test.describe('Open Workspace', () => {
  test('Verify the open an existing workspace from device', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('my-workspace');
    await fs.writeFile(path.join(workspacePath, 'workspace.yml'),
      `
      opencollection: 1.0.0

      info:
       name: "my-workspace"
       type: workspace
      `
    );

    await fs.mkdir(path.join(workspacePath, 'collections'), { recursive: true });

    const userDataPath = await createTmpDir('open-workspace');
    const app: ElectronApplication = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    await app.evaluate(({ dialog }, workspacePath) => {
      (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
        Promise.resolve({
          canceled: false,
          filePaths: [workspacePath]
        });
    },
    workspacePath
    );

    await test.step('Open Workspace from My Workspace menu', async () => {
      await page.getByTestId('workspace-menu').click();
      await locators.dropdown.item('Open workspace').click();
    });

    await test.step('Verify workspace opened successfully', async () => {
      await expect(page.getByText('Workspace opened successfully', { exact: true })).toBeVisible();
      await expect(page.getByTestId('workspace-name')).toHaveText('my-workspace');
    });
  });

  test('click on cancel button, should just close the dialog', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('open-workspace-cancel');

    let app: ElectronApplication = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const initialWorkspaceName = await page.getByTestId('workspace-name').textContent();

    await app.evaluate(({ dialog }) => {
      (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
        Promise.resolve({ canceled: true, filePaths: [] });
    });

    await test.step('Open the workspace menu and click "Open workspace"', async () => {
      await page.getByTestId('workspace-menu').click();
      await locators.dropdown.item('Open workspace').click();
    });

    await test.step('Workspace unchanged after canceling the dialog', async () => {
      expect(initialWorkspaceName).not.toBeNull();
      const workspaceName = initialWorkspaceName as string;
      await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName);
    });
  });
});
