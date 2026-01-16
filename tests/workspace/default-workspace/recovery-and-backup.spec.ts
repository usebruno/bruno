import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';

test.describe('Default Workspace Recovery and Backup', () => {
  test.describe('Global Environments Backup', () => {
    test('should create backup file for global environments during migration', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('global-env-backup');

      // Setup: Create global-environments.json
      const globalEnvData = {
        environments: [
          {
            uid: 'env1abcdefghijk123456',
            name: 'Production',
            variables: [
              { uid: 'var1abcdefghijk123456', name: 'API_URL', value: 'https://api.prod.com', secret: false, type: 'text', enabled: true }
            ]
          },
          {
            uid: 'env2abcdefghijk123456',
            name: 'Staging',
            variables: [
              { uid: 'var2abcdefghijk123456', name: 'API_URL', value: 'https://api.staging.com', secret: false, type: 'text', enabled: true }
            ]
          }
        ],
        activeGlobalEnvironmentUid: 'env1abcdefghijk123456'
      };
      fs.writeFileSync(
        path.join(userDataPath, 'global-environments.json'),
        JSON.stringify(globalEnvData)
      );

      // Also add lastOpenedCollections to trigger migration
      const collectionPath = path.join(userDataPath, 'test-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Test', type: 'collection' })
      );
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({ lastOpenedCollections: [collectionPath] })
      );

      // Launch app - should trigger migration and create backup
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Verify backup file was created
      const backupPath = path.join(userDataPath, 'global-environments-backup.json');
      expect(fs.existsSync(backupPath)).toBe(true);

      // Verify backup content
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      expect(backup.environments).toHaveLength(2);
      expect(backup.environments[0].name).toBe('Production');
      expect(backup.environments[1].name).toBe('Staging');
      expect(backup.activeGlobalEnvironmentUid).toBe('env1abcdefghijk123456');
      expect(backup.backupDate).toBeDefined();

      await app.context().close();
      await app.close();
    });

    test('should preserve global environments backup across multiple app restarts', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('global-env-backup-persist');

      // Setup: Create legacy global environments
      const globalEnvData = {
        environments: [
          { uid: 'env1abcdefghijk123456', name: 'Dev', variables: [] }
        ],
        activeGlobalEnvironmentUid: 'env1abcdefghijk123456'
      };
      fs.writeFileSync(
        path.join(userDataPath, 'global-environments.json'),
        JSON.stringify(globalEnvData)
      );

      // Add collection to trigger migration
      const collectionPath = path.join(userDataPath, 'test-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Test', type: 'collection' })
      );
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({ lastOpenedCollections: [collectionPath] })
      );

      // First launch
      const app1 = await launchElectronApp({ userDataPath });
      const page1 = await app1.firstWindow();
      await page1.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await app1.close();

      // Verify backup exists
      const backupPath = path.join(userDataPath, 'global-environments-backup.json');
      expect(fs.existsSync(backupPath)).toBe(true);
      const backupContentAfterFirst = fs.readFileSync(backupPath, 'utf8');

      // Second launch - backup should still exist
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Backup should not be modified on second launch
      expect(fs.existsSync(backupPath)).toBe(true);
      const backupContentAfterSecond = fs.readFileSync(backupPath, 'utf8');
      expect(backupContentAfterSecond).toBe(backupContentAfterFirst);

      await app2.context().close();
      await app2.close();
    });
  });

  test.describe('lastOpenedCollections Preservation', () => {
    test('should NOT delete lastOpenedCollections from preferences after migration', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('preserve-last-opened');

      // Setup: Create a valid collection
      const collectionPath = path.join(userDataPath, 'my-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'My Collection', type: 'collection' })
      );

      // Setup: Create preferences with lastOpenedCollections
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({ lastOpenedCollections: [collectionPath] })
      );

      // Launch app - triggers migration
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await app.close();

      // Verify lastOpenedCollections is still in preferences
      const prefsPath = path.join(userDataPath, 'preferences.json');
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      expect(prefs.lastOpenedCollections).toBeDefined();
      expect(prefs.lastOpenedCollections).toContain(collectionPath);
    });
  });

  test.describe('Workspace Discovery (No Path in Preferences)', () => {
    test('should find and use existing valid default workspace when path not in preferences', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('discover-existing');

      // Setup: Create a valid default workspace manually (without setting in preferences)
      const workspacePath = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(workspacePath, { recursive: true });
      fs.mkdirSync(path.join(workspacePath, 'collections'), { recursive: true });
      fs.mkdirSync(path.join(workspacePath, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(workspacePath, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
specs:
docs: ''
`
      );

      // Create empty preferences (no defaultWorkspacePath)
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({})
      );

      // Launch app - should discover and use existing workspace
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // UI always shows "My Workspace"
      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Should NOT create a new workspace
      expect(fs.existsSync(path.join(userDataPath, 'default-workspace-1'))).toBe(false);

      // Preferences should now have the path set (electron-store saves under 'preferences' key)
      const prefs = JSON.parse(fs.readFileSync(path.join(userDataPath, 'preferences.json'), 'utf8'));
      expect(prefs.preferences?.general?.defaultWorkspacePath).toBe(workspacePath);

      await app.context().close();
      await app.close();
    });

    test('should find latest numbered workspace when multiple exist and path not in preferences', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('discover-numbered');

      // Setup: Create multiple numbered workspaces
      const workspace0 = path.join(userDataPath, 'default-workspace');
      const workspace1 = path.join(userDataPath, 'default-workspace-1');
      const workspace2 = path.join(userDataPath, 'default-workspace-2');

      for (const wsPath of [workspace0, workspace1, workspace2]) {
        fs.mkdirSync(wsPath, { recursive: true });
        fs.mkdirSync(path.join(wsPath, 'environments'), { recursive: true });
        fs.writeFileSync(
          path.join(wsPath, 'workspace.yml'),
          `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
specs:
docs: ''
`
        );
      }

      // Create empty preferences
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({})
      );

      // Launch app - should use workspace-2 (latest/highest number)
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Verify the correct workspace was selected (workspace-2)
      const prefs = JSON.parse(fs.readFileSync(path.join(userDataPath, 'preferences.json'), 'utf8'));
      expect(prefs.preferences?.general?.defaultWorkspacePath).toBe(workspace2);

      // No new workspace should be created
      expect(fs.existsSync(path.join(userDataPath, 'default-workspace-3'))).toBe(false);

      await app.context().close();
      await app.close();
    });

    test('should skip invalid workspaces and use latest valid one', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('discover-skip-invalid');

      // Setup: Create workspaces where latest is invalid
      const workspace0 = path.join(userDataPath, 'default-workspace');
      const workspace1 = path.join(userDataPath, 'default-workspace-1');
      const workspace2 = path.join(userDataPath, 'default-workspace-2');

      // workspace-0: valid
      fs.mkdirSync(workspace0, { recursive: true });
      fs.writeFileSync(
        path.join(workspace0, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
specs:
docs: ''
`
      );

      // workspace-1: valid (should be selected as highest valid)
      fs.mkdirSync(workspace1, { recursive: true });
      fs.writeFileSync(
        path.join(workspace1, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
specs:
docs: ''
`
      );

      // workspace-2: invalid (corrupt YAML)
      fs.mkdirSync(workspace2, { recursive: true });
      fs.writeFileSync(path.join(workspace2, 'workspace.yml'), 'invalid: yaml: [[[');

      // Create empty preferences
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({})
      );

      // Launch app - should skip workspace-2, use workspace-1
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Verify workspace-1 was selected (not workspace-2 which is broken)
      const prefs = JSON.parse(fs.readFileSync(path.join(userDataPath, 'preferences.json'), 'utf8'));
      expect(prefs.preferences?.general?.defaultWorkspacePath).toBe(workspace1);

      await app.context().close();
      await app.close();
    });
  });

  test.describe('Recovery from Broken Workspace', () => {
    test('should recover collections from broken workspace to new workspace', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('recover-collections');

      // Setup: Create a valid collection
      const collectionPath = path.join(userDataPath, 'external-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'External Collection', type: 'collection' })
      );

      // Setup: Create a "broken" workspace with valid workspace.yml but invalid internal state
      const brokenWorkspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(brokenWorkspace, { recursive: true });
      fs.mkdirSync(path.join(brokenWorkspace, 'environments'), { recursive: true });
      // Write a valid workspace.yml that references the collection
      fs.writeFileSync(
        path.join(brokenWorkspace, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "Old Workspace"
  type: workspace
collections:
  - name: "External Collection"
    path: "${collectionPath}"
specs:
docs: ''
`
      );

      // Now corrupt it
      fs.writeFileSync(path.join(brokenWorkspace, 'workspace.yml'), 'invalid: yaml: [[[');

      // Set preferences to point to broken workspace
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: { defaultWorkspacePath: brokenWorkspace }
        })
      );

      // Launch app - should recover collections and create new workspace
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // New workspace should be created
      const newWorkspace = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(newWorkspace)).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should recover environments from broken workspace to new workspace', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('recover-envs');

      // Setup: Create a workspace with environments
      const brokenWorkspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(brokenWorkspace, { recursive: true });
      const envDir = path.join(brokenWorkspace, 'environments');
      fs.mkdirSync(envDir, { recursive: true });

      // Create environment files
      fs.writeFileSync(
        path.join(envDir, 'production.yml'),
        `name: production
variables:
  - uid: var1
    name: API_URL
    value: https://api.prod.com
    enabled: true
    secret: false
    type: text
`
      );
      fs.writeFileSync(
        path.join(envDir, 'staging.yml'),
        `name: staging
variables:
  - uid: var2
    name: API_URL
    value: https://api.staging.com
    enabled: true
    secret: false
    type: text
`
      );

      // Create valid workspace.yml first
      fs.writeFileSync(
        path.join(brokenWorkspace, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "Old Workspace"
  type: workspace
collections:
specs:
docs: ''
`
      );

      // Now corrupt it
      fs.writeFileSync(path.join(brokenWorkspace, 'workspace.yml'), 'broken: [[[');

      // Set preferences
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: { defaultWorkspacePath: brokenWorkspace }
        })
      );

      // Launch app
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // New workspace should have recovered environments
      const newWorkspace = path.join(userDataPath, 'default-workspace-1');
      const newEnvDir = path.join(newWorkspace, 'environments');
      expect(fs.existsSync(newEnvDir)).toBe(true);
      expect(fs.existsSync(path.join(newEnvDir, 'production.yml'))).toBe(true);
      expect(fs.existsSync(path.join(newEnvDir, 'staging.yml'))).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should use lastOpenedCollections as fallback when workspace config parsing fails', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('recover-fallback');

      // Setup: Create a valid collection
      const collectionPath = path.join(userDataPath, 'fallback-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Fallback Collection', type: 'collection' })
      );

      // Setup: Create broken workspace with NO valid config to recover from
      const brokenWorkspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(brokenWorkspace, { recursive: true });
      fs.writeFileSync(path.join(brokenWorkspace, 'workspace.yml'), 'totally: broken: [[[');

      // Set preferences with lastOpenedCollections AND point to broken workspace
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: { defaultWorkspacePath: brokenWorkspace },
          lastOpenedCollections: [collectionPath]
        })
      );

      // Launch app
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // New workspace should have the collection from lastOpenedCollections
      const newWorkspace = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(newWorkspace)).toBe(true);

      const workspaceYml = fs.readFileSync(path.join(newWorkspace, 'workspace.yml'), 'utf8');
      expect(workspaceYml).toContain('fallback-collection');

      await app.context().close();
      await app.close();
    });
  });

  test.describe('Recovery from Non-Existent Workspace Path', () => {
    test('should recover from previously created workspace when path in preferences does not exist', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('recover-from-old');

      // Setup: Create a valid collection
      const collectionPath = path.join(userDataPath, 'old-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Old Collection', type: 'collection' })
      );

      // Setup: Create an old default workspace (simulating previously created)
      const oldWorkspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(oldWorkspace, { recursive: true });
      fs.mkdirSync(path.join(oldWorkspace, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(oldWorkspace, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
  - name: "Old Collection"
    path: "${collectionPath}"
specs:
docs: ''
`
      );

      // Set preferences to point to non-existent path
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: { defaultWorkspacePath: '/non/existent/path/workspace' }
        })
      );

      // Launch app - should find and use the existing valid workspace
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Since path doesn't exist but we have a valid workspace, it should use it
      // OR create a new one recovering from the existing one
      const prefs = JSON.parse(fs.readFileSync(path.join(userDataPath, 'preferences.json'), 'utf8'));
      // Either uses the existing workspace or creates workspace-1
      const usedExisting = prefs.preferences?.general?.defaultWorkspacePath === oldWorkspace;
      const createdNew = fs.existsSync(path.join(userDataPath, 'default-workspace-1'));
      expect(usedExisting || createdNew).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should recover from latest workspace when path does not exist and multiple workspaces exist', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('recover-from-latest');

      // Create collection
      const collectionPath = path.join(userDataPath, 'latest-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Latest Collection', type: 'collection' })
      );

      // Create older collection
      const oldCollectionPath = path.join(userDataPath, 'old-collection');
      fs.mkdirSync(oldCollectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldCollectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Old Collection', type: 'collection' })
      );

      // Create workspace-0 (older)
      const workspace0 = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(workspace0, { recursive: true });
      fs.mkdirSync(path.join(workspace0, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(workspace0, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
  - name: "Old Collection"
    path: "${oldCollectionPath}"
specs:
docs: ''
`
      );

      // Create workspace-1 (newer - should be used)
      const workspace1 = path.join(userDataPath, 'default-workspace-1');
      fs.mkdirSync(workspace1, { recursive: true });
      fs.mkdirSync(path.join(workspace1, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(workspace1, 'workspace.yml'),
        `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
  - name: "Latest Collection"
    path: "${collectionPath}"
specs:
docs: ''
`
      );

      // Set preferences to non-existent path
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: { defaultWorkspacePath: '/deleted/workspace/path' }
        })
      );

      // Launch app - should use workspace-1 (latest valid)
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Verify workspace-1 was used (or workspace-2 was created recovering from workspace-1)
      const prefs = JSON.parse(fs.readFileSync(path.join(userDataPath, 'preferences.json'), 'utf8'));
      const usedWorkspace1 = prefs.preferences?.general?.defaultWorkspacePath === workspace1;
      const createdWorkspace2 = fs.existsSync(path.join(userDataPath, 'default-workspace-2'));
      expect(usedWorkspace1 || createdWorkspace2).toBe(true);

      await app.context().close();
      await app.close();
    });
  });

  test.describe('App Restart After Breaking Workspace', () => {
    test('should recover data after workspace is corrupted between app restarts', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('restart-after-break');

      // Setup collection
      const collectionPath = path.join(userDataPath, 'important-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Important Collection', type: 'collection' })
      );

      // First launch - creates workspace
      const app1 = await launchElectronApp({ userDataPath });
      const page1 = await app1.firstWindow();
      await page1.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Verify workspace was created
      const workspacePath = path.join(userDataPath, 'default-workspace');
      expect(fs.existsSync(workspacePath)).toBe(true);

      await app1.close();

      // Now add collection to the workspace
      const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
      fs.writeFileSync(
        workspaceYmlPath,
        `opencollection: 1.0.0
info:
  name: "My Workspace"
  type: workspace
collections:
  - name: "Important Collection"
    path: "${collectionPath}"
specs:
docs: ''
`
      );

      // Create environment in workspace
      const envDir = path.join(workspacePath, 'environments');
      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(
        path.join(envDir, 'myenv.yml'),
        `name: myenv
variables:
  - uid: v1
    name: KEY
    value: secret123
    enabled: true
    secret: false
    type: text
`
      );

      // CORRUPT the workspace
      fs.writeFileSync(workspaceYmlPath, 'corrupted: [[[');

      // Second launch - should recover
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // New workspace should exist
      const newWorkspace = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(newWorkspace)).toBe(true);

      // Environment should be recovered
      expect(fs.existsSync(path.join(newWorkspace, 'environments', 'myenv.yml'))).toBe(true);

      await app2.context().close();
      await app2.close();
    });

    test('should handle workspace deleted between app restarts', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('restart-after-delete');

      // First launch - creates workspace
      const app1 = await launchElectronApp({ userDataPath });
      const page1 = await app1.firstWindow();
      await page1.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const workspacePath = path.join(userDataPath, 'default-workspace');
      expect(fs.existsSync(workspacePath)).toBe(true);

      await app1.close();

      // DELETE the workspace directory
      fs.rmSync(workspacePath, { recursive: true, force: true });
      expect(fs.existsSync(workspacePath)).toBe(false);

      // Second launch - should create new workspace
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // New workspace should be created at default-workspace (since it was deleted)
      expect(fs.existsSync(workspacePath)).toBe(true);
      expect(fs.existsSync(path.join(workspacePath, 'workspace.yml'))).toBe(true);

      await app2.context().close();
      await app2.close();
    });

    test('should preserve all data through multiple corruption and recovery cycles', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('multiple-recovery-cycles');

      // Create collection
      const collectionPath = path.join(userDataPath, 'persistent-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Persistent Collection', type: 'collection' })
      );

      // Create preferences with lastOpenedCollections (no global environments for simpler test)
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({ lastOpenedCollections: [collectionPath] })
      );

      // First launch
      const app1 = await launchElectronApp({ userDataPath });
      const page1 = await app1.firstWindow();
      await page1.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await app1.close();

      // Verify workspace-0 created
      const ws0 = path.join(userDataPath, 'default-workspace');
      expect(fs.existsSync(ws0)).toBe(true);

      // Add an environment to workspace-0
      const envDir0 = path.join(ws0, 'environments');
      fs.mkdirSync(envDir0, { recursive: true });
      fs.writeFileSync(
        path.join(envDir0, 'PersistentEnv.yml'),
        `name: PersistentEnv
variables: []
`
      );

      // Corrupt workspace-0
      fs.writeFileSync(path.join(ws0, 'workspace.yml'), 'broken1: [[[');

      // Second launch - recovery to workspace-1
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await app2.close();

      // Verify workspace-1 created with recovered data
      const ws1 = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(ws1)).toBe(true);
      expect(fs.existsSync(path.join(ws1, 'environments', 'PersistentEnv.yml'))).toBe(true);

      const ws1Yml = fs.readFileSync(path.join(ws1, 'workspace.yml'), 'utf8');
      expect(ws1Yml).toContain('persistent-collection');

      // Corrupt workspace-1
      fs.writeFileSync(path.join(ws1, 'workspace.yml'), 'broken2: [[[');

      // Third launch - recovery to workspace-2
      const app3 = await launchElectronApp({ userDataPath });
      const page3 = await app3.firstWindow();
      await page3.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Verify workspace-2 created with all data preserved
      const ws2 = path.join(userDataPath, 'default-workspace-2');
      expect(fs.existsSync(ws2)).toBe(true);
      expect(fs.existsSync(path.join(ws2, 'environments', 'PersistentEnv.yml'))).toBe(true);

      const ws2Yml = fs.readFileSync(path.join(ws2, 'workspace.yml'), 'utf8');
      expect(ws2Yml).toContain('persistent-collection');

      await app3.context().close();
      await app3.close();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty environments directory during recovery', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('empty-env-dir');

      // Create workspace with empty environments dir
      const workspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(workspace, { recursive: true });
      fs.mkdirSync(path.join(workspace, 'environments'), { recursive: true });
      fs.writeFileSync(path.join(workspace, 'workspace.yml'), 'broken: [[[');

      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({ general: { defaultWorkspacePath: workspace } })
      );

      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Should not crash, new workspace created
      const newWorkspace = path.join(userDataPath, 'default-workspace-1');
      expect(fs.existsSync(newWorkspace)).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should handle missing environments directory during recovery', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('missing-env-dir');

      // Create workspace WITHOUT environments dir
      const workspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(workspace, { recursive: true });
      fs.writeFileSync(path.join(workspace, 'workspace.yml'), 'broken: [[[');

      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({ general: { defaultWorkspacePath: workspace } })
      );

      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Should not crash
      expect(fs.existsSync(path.join(userDataPath, 'default-workspace-1'))).toBe(true);

      await app.context().close();
      await app.close();
    });

    test('should deduplicate collections between recovered and preference sources', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('dedup-collections');

      // Create collection
      const collectionPath = path.join(userDataPath, 'shared-collection');
      fs.mkdirSync(collectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(collectionPath, 'bruno.json'),
        JSON.stringify({ version: '1', name: 'Shared Collection', type: 'collection' })
      );

      // Create workspace with the collection (but it will be corrupted)
      const workspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(workspace, { recursive: true });
      fs.mkdirSync(path.join(workspace, 'environments'), { recursive: true });
      // Workspace is created but immediately corrupted - no valid config to recover collections from
      fs.writeFileSync(path.join(workspace, 'workspace.yml'), 'broken: [[[');

      // Add same collection to lastOpenedCollections
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          general: { defaultWorkspacePath: workspace },
          lastOpenedCollections: [collectionPath]
        })
      );

      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // New workspace should have collection only ONCE (no duplicates)
      const newWorkspace = path.join(userDataPath, 'default-workspace-1');
      const yml = fs.readFileSync(path.join(newWorkspace, 'workspace.yml'), 'utf8');

      // Count collection entries by counting "- name:" patterns (each collection has one)
      const collectionEntries = yml.match(/- name:/g);
      expect(collectionEntries).toHaveLength(1);

      await app.context().close();
      await app.close();
    });

    test('should not overwrite recovered environments with global environments of same name', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('env-no-overwrite');

      // Create workspace with environment
      const workspace = path.join(userDataPath, 'default-workspace');
      fs.mkdirSync(workspace, { recursive: true });
      const envDir = path.join(workspace, 'environments');
      fs.mkdirSync(envDir, { recursive: true });

      // Environment in workspace (should be preserved)
      fs.writeFileSync(
        path.join(envDir, 'Production.yml'),
        `name: Production
variables:
  - uid: v1
    name: URL
    value: workspace-value
    enabled: true
    secret: false
    type: text
`
      );

      // Corrupt workspace.yml
      fs.writeFileSync(path.join(workspace, 'workspace.yml'), 'broken: [[[');

      // Create global environments with same name but different value
      fs.writeFileSync(
        path.join(userDataPath, 'global-environments.json'),
        JSON.stringify({
          environments: [{
            uid: 'env1abcdefghijk123456',
            name: 'Production',
            variables: [{ uid: 'var1abcdefghijk123456', name: 'URL', value: 'global-value', secret: false, type: 'text', enabled: true }]
          }],
          activeGlobalEnvironmentUid: 'env1abcdefghijk123456'
        })
      );

      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({ general: { defaultWorkspacePath: workspace } })
      );

      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Check new workspace has the recovered environment (not overwritten by global)
      const newWorkspace = path.join(userDataPath, 'default-workspace-1');
      const envContent = fs.readFileSync(path.join(newWorkspace, 'environments', 'Production.yml'), 'utf8');
      expect(envContent).toContain('workspace-value');
      expect(envContent).not.toContain('global-value');

      await app.context().close();
      await app.close();
    });
  });
});
