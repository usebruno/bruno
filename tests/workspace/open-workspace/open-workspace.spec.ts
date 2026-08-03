import type { ElectronApplication } from '@playwright/test';
import { expect, test } from '../../../playwright';
import { buildCommonLocators, waitForReadyPage } from '../../utils/page';

test.describe('Open Workspace', () => {
  test('click on cancel button, should just close the dialog', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('open-workspace-cancel');

    let app: ElectronApplication = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    const initialWorkspaceName = await page
      .getByTestId('workspace-name')
      .textContent();

    await app.evaluate(({ dialog }) => {
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
      expect(initialWorkspaceName).not.toBeNull();
      const workspaceName = initialWorkspaceName as string;
      await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName);
    });
  });
});
