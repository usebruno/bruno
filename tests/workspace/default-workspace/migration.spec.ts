import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';

const env = {
  DISABLE_SAMPLE_COLLECTION_IMPORT: 'false'
};

test.describe('Default Workspace Migration', () => {
  test.describe('Migration from lastOpenedCollections', () => {
    test('should migrate collections from lastOpenedCollections to new workspace', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-migration');

      await test.step('Setup test collection and preferences', async () => {
        const testCollectionPath = path.join(userDataPath, 'my-old-collection');
        fs.mkdirSync(testCollectionPath, { recursive: true });
        fs.writeFileSync(
          path.join(testCollectionPath, 'bruno.json'),
          JSON.stringify({
            version: '1',
            name: 'My Old Collection',
            type: 'collection'
          })
        );
        fs.writeFileSync(
          path.join(userDataPath, 'preferences.json'),
          JSON.stringify({
            lastOpenedCollections: [testCollectionPath]
          })
        );
      });

      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Verify workspace UI', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');
      });

      await test.step('Verify workspace filesystem artifacts', async () => {
        const workspacePath = path.join(userDataPath, 'default-workspace');
        expect(fs.existsSync(workspacePath)).toBe(true);

        const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
        expect(fs.existsSync(workspaceYmlPath)).toBe(true);
        const workspaceYml = fs.readFileSync(workspaceYmlPath, 'utf8');
        expect(workspaceYml).toContain('collections:');
        expect(workspaceYml).toContain('my-old-collection');
      });

      await test.step('Cleanup', async () => {
        await app.context().close();
        await app.close();
      });
    });

    test('should migrate multiple collections from lastOpenedCollections', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-migration-multiple');

      // Create multiple test collections
      const collection1Path = path.join(userDataPath, 'collection-1');
      const collection2Path = path.join(userDataPath, 'collection-2');

      for (const collPath of [collection1Path, collection2Path]) {
        fs.mkdirSync(collPath, { recursive: true });
        fs.writeFileSync(
          path.join(collPath, 'bruno.json'),
          JSON.stringify({
            version: '1',
            name: path.basename(collPath),
            type: 'collection'
          })
        );
      }

      // Create old-style preferences
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          lastOpenedCollections: [collection1Path, collection2Path]
        })
      );

      // Launch app
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Verify workspace.yml has both collections
      const workspacePath = path.join(userDataPath, 'default-workspace');
      const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
      expect(fs.existsSync(workspaceYmlPath)).toBe(true);
      const workspaceYml = fs.readFileSync(workspaceYmlPath, 'utf8');
      expect(workspaceYml).toContain('collection-1');
      expect(workspaceYml).toContain('collection-2');

      await app.context().close();
      await app.close();
    });
  });

  test.describe('Migration does not affect existing users', () => {
    test('should skip sample collection when user has existing collections', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-existing-user');

      // Create a test collection (simulating existing user)
      const oldCollectionPath = path.join(userDataPath, 'old-user-collection');
      fs.mkdirSync(oldCollectionPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldCollectionPath, 'bruno.json'),
        JSON.stringify({
          version: '1',
          name: 'Old User Collection',
          type: 'collection'
        })
      );

      // Create old-style preferences with lastOpenedCollections
      fs.writeFileSync(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          lastOpenedCollections: [oldCollectionPath]
        })
      );

      // Launch app - sample collection should NOT be created (existing user)
      const app = await launchElectronApp({ userDataPath, dotEnv: env });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // Verify default workspace is created
      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Sample collection should NOT be created (because user has existing collections)
      const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
      await expect(sampleCollection).not.toBeVisible();

      await app.context().close();
      await app.close();
    });
  });

  test.describe('No duplicate workspaces on restart', () => {
    test('should reuse existing workspace on subsequent launches', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-reuse');

      // First launch - creates workspace
      const app1 = await launchElectronApp({ userDataPath });
      const page1 = await app1.firstWindow();
      await page1.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await expect(page1.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Verify initial workspace was created
      const workspacePath = path.join(userDataPath, 'default-workspace');
      expect(fs.existsSync(workspacePath)).toBe(true);
      const originalYmlContent = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');

      await app1.context().close();
      await app1.close();

      // Second launch - should reuse existing workspace
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace');

      // workspace.yml should NOT have been modified
      const currentYmlContent = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');
      expect(currentYmlContent).toBe(originalYmlContent);

      // No new workspace should have been created
      expect(fs.existsSync(path.join(userDataPath, 'default-workspace-1'))).toBe(false);

      await app2.context().close();
      await app2.close();
    });
  });

  test.describe('Clean installation', () => {
    test('should create empty workspace on fresh install without old preferences', async ({ launchElectronApp, createTmpDir }) => {
      const userDataPath = await createTmpDir('default-workspace-clean');

      // Launch with completely empty user data (no preferences file)
      const app = await launchElectronApp({ userDataPath });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace');

      // Verify workspace was created
      const workspacePath = path.join(userDataPath, 'default-workspace');
      expect(fs.existsSync(workspacePath)).toBe(true);

      // Verify workspace has empty collections section
      const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
      expect(fs.existsSync(workspaceYmlPath)).toBe(true);
      const workspaceYml = fs.readFileSync(workspaceYmlPath, 'utf8');
      // Collections should be empty (just the key)
      expect(workspaceYml).toMatch(/collections:\s*\n/);

      await app.context().close();
      await app.close();
    });
  });
});
