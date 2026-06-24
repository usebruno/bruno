import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp, Page } from '../../../playwright';

const initUserDataPath = path.join(__dirname, '../create-workspace/init-user-data');

function findCreatedWorkspaceDirs(location: string): string[] {
  return fs.readdirSync(location).filter((e) => {
    const fullPath = path.join(location, e);
    return (
      fs.statSync(fullPath).isDirectory()
      && e !== 'default-workspace'
      && fs.existsSync(path.join(fullPath, 'workspace.yml'))
    );
  });
}

async function createWorkspace({ page, directoryName }: { page: Page; directoryName: string }) {
  await page.locator('.workspace-name-container').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
  const renameInput = page.locator('.workspace-name-input');
  await expect(renameInput).toBeVisible({ timeout: 5000 });
  await renameInput.fill(directoryName);
  await renameInput.press('Enter');
  await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
}

test.describe('Manage Workspace', () => {
  test('should open terminal from the workspace actions menu', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('ws-location-terminal');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await app.firstWindow();

    try {
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create a workspace', async () => {
        await createWorkspace({ page, directoryName: 'Terminal Workspace' });
      });

      const wsDirs = findCreatedWorkspaceDirs(wsLocation);
      expect(wsDirs).toHaveLength(1);

      await test.step('Open Manage Workspaces', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Manage workspaces' }).click();
        await expect(page.getByText('Manage Workspace')).toBeVisible({ timeout: 5000 });
      });

      await test.step('Verify default workspace has no actions menu', async () => {
        const defaultWorkspaceItem = page.locator('.workspace-item').filter({ hasText: 'My Workspace' });
        await expect(defaultWorkspaceItem.locator('.more-actions-btn')).toHaveCount(0);
      });

      await test.step('Open terminal from workspace actions', async () => {
        const workspaceItem = page.locator('.workspace-item').filter({ hasText: 'Terminal Workspace' });
        await expect(workspaceItem).toBeVisible({ timeout: 5000 });
        await workspaceItem.locator('.more-actions-btn').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Open in Terminal' }).click();
      });

      await test.step('Verify terminal session opens at the workspace folder', async () => {
        const terminalSession = page.getByTestId('session-list-0');
        await expect(terminalSession).toBeVisible({ timeout: 5000 });
        await expect(terminalSession).toContainText(wsDirs[0]);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('Verify renaming a workspace from manage workspace section.', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('ws-location-terminal');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await app.firstWindow();

    try {
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await test.step('Create a workspace', async () => {
        await createWorkspace({ page, directoryName: 'Terminal My Workspace' });
      });

      const wsDirs = findCreatedWorkspaceDirs(wsLocation);
      expect(wsDirs).toHaveLength(1);

      await test.step('Open Manage Workspaces', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Manage workspaces' }).click();
        await expect(page.getByText('Manage Workspace')).toBeVisible({ timeout: 5000 });
      });

      await test.step('Click on the 3 dots icon on the workspace you want to rename.', async () => {
        await page.locator('.more-actions-btn').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Rename' }).click();
        await expect(page.locator('.bruno-modal-card')).toBeVisible({ timeout: 5000 });

        await test.step('Enter a new name for the workspace in the editing field.', async () => {
          const workspaceNameInput = page.locator('#workspace-name');
          await expect(workspaceNameInput).toBeVisible({ timeout: 5000 });
          await workspaceNameInput.fill('New Workspace Name');
          await page.locator('.button-content').filter({ hasText: 'Rename' }).click();
        });

        await test.step('Verify the workspace name is updated in the workspace list.', async () => {
          const workspaceItem = page.locator('[data-testid="workspace-name"]');
          await expect(workspaceItem).toHaveText('New Workspace Name');
          const manageworkspaceItem = page.locator('.workspace-item:nth-child(2) .workspace-name-row');
          await expect(manageworkspaceItem).toHaveText('New Workspace Name');
        });
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('Verify that user should be able to remove a Workspace from manage workspace section.', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('ws-location-terminal');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await app.firstWindow();

    try {
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await test.step('Create a workspace', async () => {
        await createWorkspace({ page, directoryName: 'Remove My Workspace' });
      });

      const wsDirs = findCreatedWorkspaceDirs(wsLocation);
      expect(wsDirs).toHaveLength(1);

      await test.step('Open Manage Workspaces', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Manage workspaces' }).click();
        await expect(page.getByText('Manage Workspace')).toBeVisible({ timeout: 5000 });
      });

      await test.step('Click on the 3 dots icon on the workspace you want to remove.', async () => {
        await page.locator('.more-actions-btn').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Remove' }).click();
        await expect(page.locator('.bruno-modal-card')).toBeVisible({ timeout: 5000 });
        // await page.pause();
        await expect(page.locator('.bruno-modal-content span').first()).toHaveText('Remove My Workspace');
      });
      await test.step('Click on the Remove button in the modal.', async () => {
        await page.locator('.button-content').filter({ hasText: 'Remove' }).click();
        await expect(page.locator('.workspace-item:nth-child(2) .workspace-name-row')).not.toBeVisible({ timeout: 10000 });
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
