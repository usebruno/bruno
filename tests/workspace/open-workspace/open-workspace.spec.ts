import { closeElectronApp, expect, test } from '../../../playwright';
import { buildCommonLocators, waitForReadyPage } from '../../utils/page';
import { buildTitleBarLocators } from '../../utils/page/title-bar';
import {
  clickOpenWorkspace,
  createWorkspaceOnDisk,
  stubOpenDirectoryDialog
} from '../../utils/page/workspace/open-workspace';

test.describe('Open Workspace', () => {
  test('TC-1011: Verify the Open Workspace from the device', { tag: '@sanity' }, async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('open-workspace-from-device');
    const workspacesDir = await createTmpDir('open-workspace-source');
    const workspaceName = 'Device Workspace';
    const workspacePath = createWorkspaceOnDisk(workspacesDir, workspaceName);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const titleBar = buildTitleBarLocators(page);
    const locators = buildCommonLocators(page);

    await test.step('Workspace menu lists all four workspace actions', async () => {
      await titleBar.workspaceMenuTrigger().click();
      await expect(titleBar.createWorkspaceOption()).toBeVisible();
      await expect(titleBar.openWorkspaceOption()).toBeVisible();
      await expect(titleBar.importWorkspaceOption()).toBeVisible();
      await expect(titleBar.manageWorkspacesOption()).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('Pick a valid workspace directory from the file explorer', async () => {
      await stubOpenDirectoryDialog(app, workspacePath);
      await clickOpenWorkspace(page);
    });

    await test.step('Verify success toast is shown', async () => {
      await expect(locators.toast.byMessage('Workspace opened successfully')).toBeVisible();
    });

    await test.step('Verify the opened workspace becomes the active workspace', async () => {
      await expect(titleBar.activeWorkspaceName()).toHaveText(workspaceName);
    });

    await closeElectronApp(app);
  });

  test('TC-3213: click on cancel button, should just close the dialog', { tag: '@sanity' }, async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('open-workspace-cancel');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const titleBar = buildTitleBarLocators(page);

    const initialWorkspaceName = await titleBar.activeWorkspaceName().textContent();

    await stubOpenDirectoryDialog(app);

    await clickOpenWorkspace(page);

    await test.step('Workspace unchanged after canceling the dialog', async () => {
      expect(initialWorkspaceName).not.toBeNull();
      const workspaceName = initialWorkspaceName as string;
      await expect(titleBar.activeWorkspaceName()).toHaveText(workspaceName);
    });
  });
});
