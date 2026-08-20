import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { createWorkspace, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { openManageWorkspaces, openWorkspaceActionsMenu } from '../../utils/page/workspace/manage-workspace';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Manage Workspace', () => {
  test('TC-3109: should open terminal from the workspace actions menu', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('ws-location-terminal');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { manageWorkspace, devtools } = buildCommonLocators(page);

    try {
      await createWorkspace(page, 'Terminal Workspace');

      let workspacePath = '';

      await test.step('Open Manage Workspaces', async () => {
        await openManageWorkspaces(page);
        await expect(manageWorkspace.title()).toHaveText('Manage Workspace');
        workspacePath = (await manageWorkspace.workspacePath('Terminal Workspace').innerText()).trim();
        expect(workspacePath).not.toBe('');
      });

      await test.step('Verify default workspace has no actions menu', async () => {
        await expect(manageWorkspace.actionsTrigger('My Workspace')).toHaveCount(0);
      });

      await test.step('Open terminal from workspace actions', async () => {
        await openWorkspaceActionsMenu(page, 'Terminal Workspace');
        await manageWorkspace.actionsMenuItem('open-in-terminal').click();
      });

      await test.step('Verify terminal session opens at the workspace folder', async () => {
        const terminalSession = devtools.terminalSession(0);
        await expect(terminalSession).toBeVisible({ timeout: 5000 });
        await expect(terminalSession).toContainText(path.basename(workspacePath));
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
