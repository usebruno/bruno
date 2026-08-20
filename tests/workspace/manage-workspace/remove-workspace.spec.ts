import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import { createWorkspace, switchWorkspace, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { openManageWorkspaces, openWorkspaceActionsMenu } from '../../utils/page/workspace/manage-workspace';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Manage Workspace — remove', () => {
  test('TC-2611: Verify removing a workspace from manage workspace section', { tag: '@sanity' }, async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const wsLocation = await createTmpDir('ws-location-remove');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { manageWorkspace } = buildCommonLocators(page);

    try {
      await createWorkspace(page, 'Removable WS');
      // Removing the active workspace switches back to the default one and leaves the
      // Manage Workspace section, so remove a workspace that isn't the active one.
      await switchWorkspace(page, 'My Workspace');

      let workspacePath = '';

      await test.step('Navigate to the Manage Workspace section and verify the workspace list', async () => {
        await openManageWorkspaces(page);
        await expect(manageWorkspace.workspaceItem('My Workspace')).toBeVisible();
        await expect(manageWorkspace.workspaceItem('Removable WS')).toBeVisible();
        await expect(manageWorkspace.workspaceItems()).toHaveCount(2);

        workspacePath = (await manageWorkspace.workspacePath('Removable WS').innerText()).trim();
        expect(fs.existsSync(workspacePath)).toBe(true);
      });

      await test.step('Click Remove in the workspace actions menu', async () => {
        await openWorkspaceActionsMenu(page, 'Removable WS');
        await expect(manageWorkspace.actionsMenuItem('remove')).toBeVisible();
        await manageWorkspace.actionsMenuItem('remove').click();
      });

      await test.step('Verify the confirmation dialog asks to confirm the removal', async () => {
        await expect(manageWorkspace.removeModal()).toBeVisible();
        await expect(manageWorkspace.removeModal()).toContainText(
          'Are you sure you want to remove workspace Removable WS?'
        );
        await expect(manageWorkspace.removeModal()).toContainText(workspacePath);
      });

      await test.step('Confirm the removal', async () => {
        await manageWorkspace.removeSubmitButton().click();
        await expect(manageWorkspace.removeModal()).toBeHidden();
      });

      await test.step('Verify the removed workspace no longer appears in the workspace list', async () => {
        await expect(manageWorkspace.workspaceItem('Removable WS')).toHaveCount(0);
        await expect(manageWorkspace.workspaceItems()).toHaveCount(1);
        await expect(manageWorkspace.workspaceItem('My Workspace')).toBeVisible();
      });

      await test.step('Verify the removal survives re-opening the Manage Workspace section', async () => {
        await manageWorkspace.backButton().click();
        await expect(manageWorkspace.title()).toBeHidden();

        await openManageWorkspaces(page);
        await expect(manageWorkspace.workspaceItems()).toHaveCount(1);
        await expect(manageWorkspace.workspaceItem('Removable WS')).toHaveCount(0);
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');
      });

      await test.step('Verify the removed workspace still exists on the file system', async () => {
        expect(fs.existsSync(path.join(workspacePath, 'workspace.yml'))).toBe(true);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
