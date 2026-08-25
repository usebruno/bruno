import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp } from '../../../playwright';
import { createWorkspace, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { buildTitleBarLocators } from '../../utils/page/title-bar';
import { openManageWorkspaces, openWorkspaceActionsMenu } from '../../utils/page/workspace/manage-workspace';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Manage Workspace — rename', () => {
  test('TC-2612: Verify renaming a workspace from manage workspace section', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const wsLocation = await createTmpDir('ws-location-rename');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);

    const { manageWorkspace } = buildCommonLocators(page);
    const titleBar = buildTitleBarLocators(page);

    await createWorkspace(page, 'Rename Me WS');

    let workspacePath = '';

    await test.step('Navigate to the Manage Workspace section', async () => {
      await openManageWorkspaces(page);
      await expect(manageWorkspace.title()).toHaveText('Manage Workspace');
      await expect(manageWorkspace.workspaceItem('Rename Me WS')).toBeVisible();

      workspacePath = (await manageWorkspace.workspacePath('Rename Me WS').innerText()).trim();
      expect(workspacePath).not.toBe('');
    });

    await test.step('Open the workspace actions menu and verify the Rename option', async () => {
      await openWorkspaceActionsMenu(page, 'Rename Me WS');
      await expect(manageWorkspace.actionsMenuItem('rename')).toBeVisible();
      await expect(manageWorkspace.actionsMenuItem('rename')).toHaveText('Rename');
    });

    await test.step('Click Rename to open the rename workspace modal', async () => {
      await manageWorkspace.actionsMenuItem('rename').click();
      await expect(manageWorkspace.renameModal.modal()).toBeVisible();
      await expect(manageWorkspace.renameModal.nameInput()).toHaveValue('Rename Me WS');
    });

    await test.step('Enter a new name for the workspace', async () => {
      await manageWorkspace.renameModal.nameInput().fill('Renamed WS');
      await expect(manageWorkspace.renameModal.nameInput()).toHaveValue('Renamed WS');
      await expect(manageWorkspace.renameModal.error()).toHaveCount(0);
    });

    await test.step('Confirm the rename', async () => {
      await manageWorkspace.renameModal.submitButton().click();
      await expect(manageWorkspace.renameModal.modal()).toBeHidden();
    });

    await test.step('Verify the new name is reflected in the workspace list', async () => {
      await expect(manageWorkspace.workspaceItem('Renamed WS')).toBeVisible();
      await expect(manageWorkspace.workspaceItem('Rename Me WS')).toHaveCount(0);
    });

    await test.step('Verify the renamed workspace is still the active one in the title bar', async () => {
      await expect(titleBar.activeWorkspaceName()).toHaveText('Renamed WS');
    });

    await test.step('Verify the new name is persisted in workspace.yml', async () => {
      const config = yaml.load(
        fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8')
      );
      expect(config).toMatchObject({ info: { name: 'Renamed WS' } });
    });

    await closeElectronApp(app);
  });

  test('Verify renaming a workspace to an existing name is rejected', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const wsLocation = await createTmpDir('ws-location-rename-conflict');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);

    const { manageWorkspace } = buildCommonLocators(page);

    await createWorkspace(page, 'Rename Conflict WS');

    await test.step('Open the rename workspace modal', async () => {
      await openManageWorkspaces(page);
      await openWorkspaceActionsMenu(page, 'Rename Conflict WS');
      await manageWorkspace.actionsMenuItem('rename').click();
      await expect(manageWorkspace.renameModal.modal()).toBeVisible();
    });

    await test.step('Submit a name that already belongs to another workspace', async () => {
      await manageWorkspace.renameModal.nameInput().fill('My Workspace');
      await manageWorkspace.renameModal.submitButton().click();
    });

    await test.step('Verify the rename is rejected and the original name is unchanged', async () => {
      await expect(manageWorkspace.renameModal.error()).toHaveText('A workspace with this name already exists');
      await expect(manageWorkspace.renameModal.modal()).toBeVisible();
      await expect(manageWorkspace.workspaceItem('Rename Conflict WS')).toBeVisible();
      await expect(manageWorkspace.workspaceItem('My Workspace')).toBeVisible();
    });

    await closeElectronApp(app);
  });
});
