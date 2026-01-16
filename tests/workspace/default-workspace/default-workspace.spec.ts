import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';

test.describe('Default Workspace', () => {
  test.describe('First Launch', () => {
    test('should create default workspace with "My Workspace" name on first launch', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-first-launch');
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();

      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Verify the workspace name is "My Workspace" in the title bar
      const workspaceName = page.getByTestId('workspace-name');
      await expect(workspaceName).toHaveText('My Workspace');

      await app.context().close();
      await app.close();
    });
  });

  test.describe('Persistence', () => {
    test('should persist default workspace across app restarts', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-persistence');

      // First launch
      const app1 = await launchElectronApp({ userDataPath });
      const page1 = await app1.firstWindow();
      await page1.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await expect(page1.getByTestId('workspace-name')).toHaveText('My Workspace');

      await app1.close();

      // Second launch - same workspace should be loaded
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace');

      await app2.context().close();
      await app2.close();
    });
  });

  test.describe('Recovery - Creates NEW workspace (never modifies existing)', () => {
    test('should create NEW workspace when existing workspace.yml is deleted', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-recovery-deleted');

      // Create a corrupted default workspace BEFORE launching app
      const defaultWorkspacePath = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(defaultWorkspacePath, { recursive: true });
      fs.mkdirSync(path.join(defaultWorkspacePath, 'collections'), { recursive: true });
      // Note: NOT creating workspace.yml - simulating deleted file

      // Create preferences pointing to the corrupted workspace
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: {
            defaultWorkspacePath: defaultWorkspacePath
          }
        })
      );

      // Launch app - should create NEW workspace
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Should show "My Workspace"
      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Old directory should still exist (never deleted)
      expect(fs.existsSync(defaultWorkspacePath)).toBe(true);

      // New workspace directory should have been created (default-workspace-1 since default-workspace exists)
      const newWorkspacePath = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(newWorkspacePath)).toBe(true);
      expect(fs.existsSync(path.join(newWorkspacePath, 'workspace.yml'))).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should create NEW workspace when workspace.yml has invalid YAML', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-recovery-invalid');

      // Create workspace with invalid YAML BEFORE launching app
      const defaultWorkspacePath = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(defaultWorkspacePath, { recursive: true });
      fs.writeFileSync(path.join(defaultWorkspacePath, 'workspace.yml'), 'invalid: yaml: [[[');

      // Create preferences pointing to the corrupted workspace
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: {
            defaultWorkspacePath: defaultWorkspacePath
          }
        })
      );

      // Launch app - should create NEW workspace
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Old corrupted file should still exist (never deleted)
      const oldContent = fs.readFileSync(path.join(defaultWorkspacePath, 'workspace.yml'), 'utf8');
      expect(oldContent).toContain('invalid: yaml: [[[');

      // New workspace should have been created
      const newWorkspacePath = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(newWorkspacePath)).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should create NEW workspace when workspace.yml has wrong type', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-recovery-wrong-type');

      // Create workspace with wrong type BEFORE launching app
      const defaultWorkspacePath = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(defaultWorkspacePath, { recursive: true });
      fs.writeFileSync(path.join(defaultWorkspacePath, 'workspace.yml'), `opencollection: 1.0.0
info:
  name: My Workspace
  type: collection
collections:
specs:
docs: ''
`);

      // Create preferences pointing to the invalid workspace
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: {
            defaultWorkspacePath: defaultWorkspacePath
          }
        })
      );

      // Launch app
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // New workspace should have been created
      const newWorkspacePath = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(newWorkspacePath)).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should create NEW workspace when directory does not exist', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-recovery-dir-missing');

      // Create preferences pointing to non-existent directory
      const nonExistentPath = path.join(userDataPath, 'non-existent-workspace');
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: {
            defaultWorkspacePath: nonExistentPath
          }
        })
      );

      // Launch app
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // New workspace should have been created (default-workspace since non-existent doesn't block)
      const newWorkspacePath = path.join(userDataPath, 'default-workspace');
      expect(fs.existsSync(newWorkspacePath)).toBe(true);
      expect(fs.existsSync(path.join(newWorkspacePath, 'workspace.yml'))).toBe(true);

      await app.context().close();
      await app.close();
    });
  });

  test.describe('UI Behavior', () => {
    test('should display default workspace in workspace dropdown', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-ui-dropdown');
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();

      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Click on workspace name to open dropdown
      await page.locator('.workspace-name-container').click();

      // Verify default workspace is shown
      const workspaceItem = page.locator('.workspace-item, .dropdown-item').filter({ hasText: 'My Workspace' });
      await expect(workspaceItem.first()).toBeVisible();

      await app.context().close();
      await app.close();
    });

    test('should not show pin button for default workspace', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-ui-no-pin');
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();

      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await page.locator('.workspace-name-container').click();

      const workspaceItem = page.locator('.workspace-item').filter({ hasText: 'My Workspace' });
      // Default workspace should NOT have pin button
      await expect(workspaceItem.locator('.pin-btn')).not.toBeVisible();

      await app.context().close();
      await app.close();
    });
  });
});
