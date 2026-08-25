import path from 'path';
import { test, expect } from '../../../playwright';
import { createWorkspace } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { openManageWorkspaces, openWorkspaceActionsMenu } from '../../utils/page/workspace/manage-workspace';

test.describe('Manage Workspace', () => {
  test('TC-3109: should open terminal from the workspace actions menu', async ({ page }) => {
    const { manageWorkspace, devtools } = buildCommonLocators(page);

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
  });
});
