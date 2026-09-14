import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';

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

test.describe('Manage Workspace', () => {
  test('should open terminal from the workspace actions menu', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('ws-location-terminal');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await app.firstWindow();

    try {
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create a workspace', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Terminal Workspace');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
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
});
