import path from 'path';
import { expect, test } from '../../../playwright';
import { createWorkspace, switchWorkspace, waitForReadyPage } from '../../utils/page';
import {
  WORKSPACE_NAME,
  buildOpenWorkspaceLocators,
  initUserDataPath,
  openWorkspaceFromMenu
} from '../../utils/page/workspace/open-workspace';
import { buildTitleBarLocators } from '../../utils/page/title-bar';

test.describe('Open Workspace', () => {
  test('TC-3213: Verify that clicking the cancel button closes the dialog on open workspace', { tag: '@sanity' }, async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('open-workspace-cancel');
    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const titleBarLocators = buildTitleBarLocators(page);
    const initialWorkspaceName = await titleBarLocators.activeWorkspaceName().textContent();

    await test.step('Open workspace dialog and click on cancel', async () => {
      await openWorkspaceFromMenu(page, { app, canceled: true, filePaths: [] });
    });

    await test.step('Verify the active workspace remains unchanged', async () => {
      expect(initialWorkspaceName).not.toBeNull();
      await expect(titleBarLocators.activeWorkspaceName()).toHaveText(initialWorkspaceName as string);
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
    const locators = buildOpenWorkspaceLocators(page);
    const titleBarLocators = buildTitleBarLocators(page);

    await test.step('Create a workspace and switch back to My Workspace', async () => {
      await createWorkspace(page, WORKSPACE_NAME);
      await switchWorkspace(page, 'My Workspace');
    });

    const workspacePath = path.join(wsLocation, WORKSPACE_NAME);
    await test.step('Open the workspace from the device', async () => {
      await openWorkspaceFromMenu(page, { app, canceled: false, filePaths: [workspacePath] });
    });

    await test.step('Verify workspace opened successfully', async () => {
      await expect(locators.confirmTextContent()).toBeVisible();
      await expect(titleBarLocators.activeWorkspaceName()).toHaveText(WORKSPACE_NAME);
    });
  });
});
