import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  createWorkspace,
  switchWorkspace,
  createCollection,
  createEnvironment,
  openCollection,
  waitForReadyPage
} from '../../utils/page';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Global Environment Per-Workspace Persistence', () => {
  test('should persist selected global environment across app restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('global-env-persist');
    const wsLocation = await createTmpDir('ws-location');
    const collectionDir = await createTmpDir('collection-persist');

    // First launch
    const app1 = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { wsLocation }
    });
    const page1 = await waitForReadyPage(app1);

    // Create a collection so the environment selector is visible
    await createCollection(page1, 'Test Collection', collectionDir);

    // Create a global environment (createEnvironment also selects it)
    await createEnvironment(page1, 'Persist Test Env', 'global');
    await expect(page1.locator('.current-environment')).toContainText('Persist Test Env');

    await closeElectronApp(app1);

    // Second launch - same userDataPath to preserve electron store
    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);

    // Open the collection so the env selector is visible
    await openCollection(page2, 'Test Collection');

    // Verify the global environment is still selected after restart
    await expect(page2.locator('.current-environment')).toContainText('Persist Test Env');

    await closeElectronApp(app2);
  });

  test('should maintain independent global env selections per workspace', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('global-env-per-ws');
    const wsLocation = await createTmpDir('ws-location-multi');
    const collectionDir1 = await createTmpDir('collection-ws1');
    const collectionDir2 = await createTmpDir('collection-ws2');

    const app = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { wsLocation }
    });
    const page = await waitForReadyPage(app);

    // On the default workspace, create a collection and a global env
    await createCollection(page, 'WS1 Collection', collectionDir1);
    await createEnvironment(page, 'Env Alpha', 'global');
    await expect(page.locator('.current-environment')).toContainText('Env Alpha');

    // Create a second workspace
    await createWorkspace(page, 'Second Workspace');

    // On the second workspace, create a collection and a different global env
    await createCollection(page, 'WS2 Collection', collectionDir2);
    await createEnvironment(page, 'Env Beta', 'global');
    await expect(page.locator('.current-environment')).toContainText('Env Beta');

    // Switch back to first workspace - "Env Alpha" should still be selected
    await switchWorkspace(page, 'My Workspace');
    await openCollection(page, 'WS1 Collection');
    await expect(page.locator('.current-environment')).toContainText('Env Alpha');

    // Switch to second workspace - "Env Beta" should still be selected
    await switchWorkspace(page, 'Second Workspace');
    await openCollection(page, 'WS2 Collection');
    await expect(page.locator('.current-environment')).toContainText('Env Beta');

    await closeElectronApp(app);

    // Restart app and verify persistence across restart
    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);

    // App opens to last active workspace - verify its env is still selected
    const currentWorkspace = await page2.getByTestId('workspace-name').textContent();

    if (currentWorkspace === 'Second Workspace') {
      await openCollection(page2, 'WS2 Collection');
      await expect(page2.locator('.current-environment')).toContainText('Env Beta');
      await switchWorkspace(page2, 'My Workspace');
      await openCollection(page2, 'WS1 Collection');
      await expect(page2.locator('.current-environment')).toContainText('Env Alpha');
    } else {
      await openCollection(page2, 'WS1 Collection');
      await expect(page2.locator('.current-environment')).toContainText('Env Alpha');
      await switchWorkspace(page2, 'Second Workspace');
      await openCollection(page2, 'WS2 Collection');
      await expect(page2.locator('.current-environment')).toContainText('Env Beta');
    }

    await closeElectronApp(app2);
  });
});
