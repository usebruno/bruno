import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, createCollection, createWorkspace } from '../../../pages';
import { waitForReadyPage } from '../../../utils';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Delete workspace', () => {
  test('deletes the workspace folder with its inner collections and keeps outside collections', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('delete-workspace');
    const outsideLocation = await createTmpDir('delete-workspace-outside');
    const workspaceFolder = path.join(wsLocation, 'Delete Me WS');
    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { titleBar, collectionHeader, deleteWorkspaceModal } = buildCommonLocators(page);

    try {
      await test.step('Create a workspace with one collection inside its folder and one outside', async () => {
        await createWorkspace(page, 'Delete Me WS');
        await expect.poll(() => fs.existsSync(path.join(workspaceFolder, 'workspace.yml'))).toBe(true);

        await createCollection(page, 'Inner Col', workspaceFolder);
        await createCollection(page, 'Outer Col', outsideLocation);
      });

      await test.step('Delete stays disabled until "delete" is typed', async () => {
        await titleBar.homeButton().click();
        await collectionHeader.workspaceActionsTrigger().click();
        await collectionHeader.workspaceActionsItem('delete').click();

        await expect(deleteWorkspaceModal.modal()).toBeVisible();
        await expect(deleteWorkspaceModal.submitButton()).toBeDisabled();

        await deleteWorkspaceModal.confirmInput().fill('delete');
        await expect(deleteWorkspaceModal.submitButton()).toBeEnabled();
      });

      await test.step('Confirming deletes the folder and lands on My Workspace', async () => {
        await deleteWorkspaceModal.submitButton().click();

        await expect(deleteWorkspaceModal.modal()).toHaveCount(0);
        await expect(titleBar.activeWorkspaceName()).toHaveText('My Workspace');
        await expect.poll(() => fs.existsSync(workspaceFolder)).toBe(false);
      });

      await test.step('The collection stored outside the workspace folder is kept', async () => {
        expect(fs.existsSync(path.join(outsideLocation, 'Outer Col'))).toBe(true);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
