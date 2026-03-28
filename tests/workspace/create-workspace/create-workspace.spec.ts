import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp } from '../../../playwright';

type WorkspaceConfig = {
  opencollection?: string;
  info?: { name: string; type: string };
  collections?: { name?: string; path?: string }[];
};

const initUserDataPath = path.join(__dirname, 'init-user-data');

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

test.describe('Create Workspace', () => {
  test.describe('Inline Creation Flow', () => {
    test('should create workspace via inline rename and press Enter', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-enter');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Click "Create workspace" from title bar dropdown', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
      });

      await test.step('Verify inline rename input appears with default name', async () => {
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await expect(renameInput).not.toHaveValue('');
      });

      await test.step('Verify workspace is NOT yet created on filesystem', async () => {
        const wsDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(wsDirs).toHaveLength(0);
      });

      await test.step('Type workspace name and press Enter to confirm', async () => {
        const renameInput = page.locator('.workspace-name-input');
        await renameInput.fill('My Test Workspace');
        await renameInput.press('Enter');
      });

      await test.step('Verify workspace created successfully', async () => {
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('My Test Workspace', { timeout: 5000 });
      });

      await test.step('Verify workspace folder exists on filesystem', async () => {
        const wsDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(wsDirs.length).toBe(1);

        const ymlPath = path.join(wsLocation, wsDirs[0], 'workspace.yml');
        const config = yaml.load(fs.readFileSync(ymlPath, 'utf8')) as WorkspaceConfig;
        expect(config?.info?.name).toBe('My Test Workspace');
        expect(config?.info?.type).toBe('workspace');
      });

      await closeElectronApp(app);
    });

    test('should create workspace via inline rename and click check icon', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-check');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Click "Create workspace" and fill name', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();

        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Check Icon Workspace');
      });

      await test.step('Click the check icon to confirm', async () => {
        await page.locator('.inline-action-btn.save').click();
      });

      await test.step('Verify workspace created', async () => {
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Check Icon Workspace', { timeout: 5000 });
      });

      await test.step('Verify filesystem', async () => {
        const wsDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(wsDirs.length).toBe(1);
        expect(fs.existsSync(path.join(wsLocation, wsDirs[0], 'workspace.yml'))).toBe(true);
      });

      await closeElectronApp(app);
    });

    test('should create workspace via inline rename and click outside', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-outside');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create workspace and fill name', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();

        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Click Outside Workspace');
      });

      await test.step('Click outside the rename container to confirm', async () => {
        await page.locator('.app-titlebar').click({ position: { x: 500, y: 10 } });
      });

      await test.step('Verify workspace created', async () => {
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Click Outside Workspace', { timeout: 5000 });
      });

      await closeElectronApp(app);
    });
  });

  test.describe('Cancel/Discard Flow', () => {
    test('should discard temp workspace when pressing Escape', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-escape');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start workspace creation', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
      });

      await test.step('Press Escape to cancel', async () => {
        await page.locator('.workspace-name-input').press('Escape');
      });

      await test.step('Verify switched back to default workspace', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 5000 });
      });

      await test.step('Verify no workspace folder created on filesystem', async () => {
        const wsDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(wsDirs).toHaveLength(0);
      });

      await closeElectronApp(app);
    });

    test('should discard temp workspace when clicking X icon', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-x');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start workspace creation', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
      });

      await test.step('Click the X icon to cancel', async () => {
        await page.locator('.inline-action-btn.cancel').click();
      });

      await test.step('Verify switched back to default workspace', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 5000 });
      });

      await closeElectronApp(app);
    });

    test('should discard temp workspace when clicking outside with empty name', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-outside-empty');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start workspace creation and clear the name', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('');
      });

      await test.step('Click outside to trigger cancel with empty name', async () => {
        await page.locator('.app-titlebar').click({ position: { x: 500, y: 10 } });
      });

      await test.step('Verify switched back to default workspace', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 5000 });
      });

      await closeElectronApp(app);
    });
  });

  test.describe('Advanced Modal Flow', () => {
    test('should create workspace via advanced modal with custom location', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-modal');
      const customLocation = await createTmpDir('custom-ws-location');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start inline creation and click settings icon to open advanced modal', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });

        // Settings gear icon should be visible during creation
        const cogBtn = page.locator('.cog-btn');
        await expect(cogBtn).toBeVisible();
        await cogBtn.click();
      });

      await test.step('Fill in the advanced modal form with custom location', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Fill workspace name
        await modal.locator('#workspace-name').fill('Advanced Workspace');

        // Wait for folder name section to appear
        await page.waitForTimeout(300);

        // The location input is read-only and Formik-controlled — .fill() won't update
        // Formik state. Stub the dialog so the browse() callback sets the custom location.
        await app.evaluate(
          ({ dialog }, targetPath: string) => {
            (dialog as any).showOpenDialog = () =>
              Promise.resolve({ canceled: false, filePaths: [targetPath] });
          },
          customLocation
        );
        // Click the location input to trigger browse() which calls showOpenDialog
        await modal.locator('#workspace-location').click();
        // Verify location was set
        await expect(modal.locator('#workspace-location')).toHaveValue(customLocation, { timeout: 5000 });
      });

      await test.step('Submit the form', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await modal.getByRole('button', { name: 'Create Workspace' }).click();
      });

      await test.step('Verify workspace created', async () => {
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Advanced Workspace', { timeout: 5000 });
      });

      await test.step('Verify filesystem at custom location (NOT default location)', async () => {
        // Workspace should be at customLocation, not wsLocation
        const customDirs = findCreatedWorkspaceDirs(customLocation);
        expect(customDirs.length).toBe(1);

        const config = yaml.load(
          fs.readFileSync(path.join(customLocation, customDirs[0], 'workspace.yml'), 'utf8')
        ) as WorkspaceConfig;
        expect(config?.info?.name).toBe('Advanced Workspace');

        // No workspace at the default location
        const defaultDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(defaultDirs).toHaveLength(0);
      });

      await test.step('Verify inline rename input is cleared after modal creation', async () => {
        await expect(page.locator('.workspace-name-input')).not.toBeVisible();
      });

      await closeElectronApp(app);
    });

    test('should create workspace via advanced modal at default location', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-modal-default');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start inline creation and open advanced modal', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
        await page.locator('.cog-btn').click();
      });

      await test.step('Fill name and keep default location', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await modal.waitFor({ state: 'visible', timeout: 5000 });
        await modal.locator('#workspace-name').fill('Default Loc Workspace');
        await page.waitForTimeout(300);
      });

      await test.step('Submit the form', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await modal.getByRole('button', { name: 'Create Workspace' }).click();
      });

      await test.step('Verify workspace created at default location', async () => {
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Default Loc Workspace', { timeout: 5000 });

        const wsDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(wsDirs.length).toBe(1);

        const config = yaml.load(
          fs.readFileSync(path.join(wsLocation, wsDirs[0], 'workspace.yml'), 'utf8')
        ) as WorkspaceConfig;
        expect(config?.info?.name).toBe('Default Loc Workspace');
      });

      await closeElectronApp(app);
    });

    test('should cancel advanced modal and discard temp workspace', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-modal-cancel');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start inline creation and open advanced modal', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
        await page.locator('.cog-btn').click();
      });

      await test.step('Cancel the advanced modal', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await modal.waitFor({ state: 'visible', timeout: 5000 });
        await modal.getByRole('button', { name: 'Cancel' }).click();
      });

      await test.step('Verify temp workspace discarded and back to default', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 5000 });
        await expect(page.locator('.workspace-name-input')).not.toBeVisible();
      });

      await closeElectronApp(app);
    });

    test('should show validation error for empty name in modal', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-modal-empty');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start inline creation and open advanced modal', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
        await page.locator('.cog-btn').click();
      });

      await test.step('Clear name and try to submit', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Ensure name field is empty
        await modal.locator('#workspace-name').fill('');
        await modal.getByRole('button', { name: 'Create Workspace' }).click();
      });

      await test.step('Verify validation error appears and modal stays open', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await expect(modal).toBeVisible();
        const error = modal.locator('.text-red-500');
        await expect(error.first()).toBeVisible({ timeout: 2000 });
      });

      await closeElectronApp(app);
    });
  });

  test.describe('Workspace Name Display', () => {
    test('should show correct name in title bar dropdown after creation', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-display');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create a workspace with specific name', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Display Test WS');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Verify name in title bar', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('Display Test WS', { timeout: 5000 });
      });

      await test.step('Verify name in title bar dropdown', async () => {
        await page.locator('.workspace-name-container').click();
        const wsItem = page.locator('.workspace-item, .dropdown-item').filter({ hasText: 'Display Test WS' });
        await expect(wsItem.first()).toBeVisible();
      });

      await closeElectronApp(app);
    });

    test('should persist workspace name after app restart', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('create-ws-name-persist');
      const wsLocation = await createTmpDir('ws-location-persist');

      // First launch: create workspace
      const app1 = await launchElectronApp({ userDataPath, initUserDataPath, templateVars: { wsLocation } });
      const page1 = await app1.firstWindow();
      await page1.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create workspace', async () => {
        await page1.locator('.workspace-name-container').click();
        await page1.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page1.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Persisted WS');
        await renameInput.press('Enter');
        await expect(page1.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
      });

      await closeElectronApp(app1);

      // Second launch: verify name persists (reuse same userDataPath)
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Verify workspace name persisted', async () => {
        await page2.locator('.workspace-name-container').click();
        const wsItem = page2.locator('.workspace-item, .dropdown-item').filter({ hasText: 'Persisted WS' });
        await expect(wsItem.first()).toBeVisible({ timeout: 5000 });
      });

      await closeElectronApp(app2);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle creating multiple workspaces sequentially', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-multiple');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create first workspace', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Workspace One');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Workspace One', { timeout: 5000 });
      });

      await test.step('Create second workspace', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Workspace Two');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Workspace Two', { timeout: 5000 });
      });

      await test.step('Verify both workspaces exist in dropdown', async () => {
        await page.locator('.workspace-name-container').click();
        const wsOne = page.locator('.workspace-item, .dropdown-item').filter({ hasText: 'Workspace One' });
        const wsTwo = page.locator('.workspace-item, .dropdown-item').filter({ hasText: 'Workspace Two' });
        await expect(wsOne.first()).toBeVisible();
        await expect(wsTwo.first()).toBeVisible();
      });

      await test.step('Verify both workspace folders on filesystem', async () => {
        const wsDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(wsDirs.length).toBe(2);
      });

      await closeElectronApp(app);
    });

    test('should handle creating then cancelling then creating again', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-cancel-retry');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start creation and cancel with Escape', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
        await page.locator('.workspace-name-input').press('Escape');
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 5000 });
      });

      await test.step('Create again successfully', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Retry Workspace');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Retry Workspace', { timeout: 5000 });
      });

      await closeElectronApp(app);
    });

    test('should handle workspace name with special characters', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-special');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create workspace with special characters in name', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('My API & Testing (v2)');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('My API & Testing (v2)', { timeout: 5000 });
      });

      await test.step('Verify workspace name stored correctly in workspace.yml', async () => {
        const wsDirs = findCreatedWorkspaceDirs(wsLocation);
        expect(wsDirs.length).toBe(1);

        const config = yaml.load(
          fs.readFileSync(path.join(wsLocation, wsDirs[0], 'workspace.yml'), 'utf8')
        ) as WorkspaceConfig;
        expect(config?.info?.name).toBe('My API & Testing (v2)');
      });

      await closeElectronApp(app);
    });

    test('should show validation error for empty name inline when pressing Enter', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-empty');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create workspace and clear name', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('');
      });

      await test.step('Press Enter with empty name - should show error', async () => {
        await page.locator('.workspace-name-input').press('Enter');
        const error = page.locator('.workspace-error');
        await expect(error).toBeVisible({ timeout: 2000 });
        await expect(error).toContainText('required');
      });

      await test.step('Verify still in rename mode (not discarded)', async () => {
        await expect(page.locator('.workspace-name-input')).toBeVisible();
      });

      await closeElectronApp(app);
    });

    test('should not show settings/cog icon when renaming an existing workspace', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-no-cog');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create a workspace first', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });

        // During creation, the cog button should be visible
        await expect(page.locator('.cog-btn')).toBeVisible();

        await renameInput.fill('Existing WS');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Rename existing workspace - cog should NOT be visible', async () => {
        // Use workspace actions dropdown to start rename
        const actionsIcon = page.locator('.workspace-actions-trigger');
        await actionsIcon.click();
        await page.locator('.dropdown-item').filter({ hasText: 'Rename' }).click();

        // Inline rename input should appear
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });

        // Cog button should NOT be visible for existing workspace rename
        await expect(page.locator('.cog-btn')).not.toBeVisible();
      });

      await closeElectronApp(app);
    });
  });

  test.describe('Workspace Switching After Creation', () => {
    test('should switch between created workspace and default workspace', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-switch');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Create a new workspace', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        const renameInput = page.locator('.workspace-name-input');
        await expect(renameInput).toBeVisible({ timeout: 5000 });
        await renameInput.fill('Switchable WS');
        await renameInput.press('Enter');
        await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('workspace-name')).toHaveText('Switchable WS', { timeout: 5000 });
      });

      await test.step('Switch to default workspace via dropdown', async () => {
        await page.locator('.workspace-name-container').click();
        const defaultWs = page.locator('.workspace-item, .dropdown-item').filter({ hasText: 'My Workspace' });
        await defaultWs.first().click();
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 5000 });
      });

      await test.step('Switch back to created workspace', async () => {
        await page.locator('.workspace-name-container').click();
        const createdWs = page.locator('.workspace-item, .dropdown-item').filter({ hasText: 'Switchable WS' });
        await createdWs.first().click();
        await expect(page.getByTestId('workspace-name')).toHaveText('Switchable WS', { timeout: 5000 });
      });

      await closeElectronApp(app);
    });
  });

  test.describe('Temp Workspace Isolation', () => {
    test('should exclude temp workspace from duplicate name validation in advanced modal', async ({ launchElectronApp, createTmpDir }) => {
      const wsLocation = await createTmpDir('ws-location-no-temp');

      const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Start creation but do not confirm', async () => {
        await page.locator('.workspace-name-container').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
        await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
      });

      await test.step('Open advanced modal and verify temp workspace name is not a conflict', async () => {
        await page.locator('.cog-btn').click();

        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Fill the same name as temp workspace — should NOT show "already exists" error
        // since isCreating workspaces are excluded from validation
        await modal.locator('#workspace-name').fill('Untitled Workspace');
        await page.waitForTimeout(500);

        const errorText = modal.locator('.text-red-500');
        const hasError = await errorText.isVisible().catch(() => false);
        if (hasError) {
          const errorContent = await errorText.textContent();
          expect(errorContent).not.toContain('already exists');
        }
      });

      await closeElectronApp(app);
    });
  });
});
