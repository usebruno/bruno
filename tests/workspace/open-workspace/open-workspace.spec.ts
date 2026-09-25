import path from 'path';
import { expect, test } from '../../../playwright';
import { buildCommonLocators, createWorkspace, stubOpenFilesDialog, switchWorkspace, waitForReadyPage } from '../../utils/page';
import { clickOpenWorkspace } from '../../utils/page/title-bar';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const WORKSPACE_NAME = 'my-workspace';

test.describe('Open Workspace', () => {
  test('TC-3213: Verify that clicking the cancel button closes the dialog on open workspace', { tag: '@sanity' }, async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('open-workspace-cancel');
    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const initialWorkspaceName = await locators.titleBar.activeWorkspaceName().textContent();

    await test.step('Open workspace dialog and click on cancel', async () => {
      await stubOpenFilesDialog(app, { canceled: true, filePaths: [] });
      await clickOpenWorkspace(page);
    });

    await test.step('Verify the active workspace remains unchanged', async () => {
      expect(initialWorkspaceName).not.toBeNull();
      await expect(locators.titleBar.activeWorkspaceName()).toHaveText(initialWorkspaceName as string);
    });
  });

  test('TC-1011: Verify the open Workspace from the device', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('ws-location');
    const userDataPath = await createTmpDir('open-workspace');
    const app = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { wsLocation }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    await test.step('Create a workspace and switch back to My Workspace', async () => {
      await createWorkspace(page, WORKSPACE_NAME);
      await switchWorkspace(page, 'My Workspace');
    });

    const workspacePath = path.join(wsLocation, WORKSPACE_NAME);
    await test.step('Open the workspace from the device', async () => {
      await stubOpenFilesDialog(app, { canceled: false, filePaths: [workspacePath] });
      await clickOpenWorkspace(page);
    });

    await test.step('Verify workspace opened successfully', async () => {
      await expect(locators.toast.byMessage('Workspace opened successfully', { exact: true })).toBeVisible();
      await expect(locators.titleBar.activeWorkspaceName()).toHaveText(WORKSPACE_NAME);
    });
  });
});
