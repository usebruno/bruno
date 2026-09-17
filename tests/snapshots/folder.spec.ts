import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createFolder,
  createWorkspace,
  focusFolderSettingsTab,
  openfolder,
  readSnapshot,
  findSnapshotFolderTab,
  selectfolderPaneTab,
  selectFolderScriptPaneTab,
  switchWorkspace,
  waitForReadyPage,
  waitForSnapshotFile
} from '../utils/page';

test.describe('Snapshot: folder Pane Interactivity', () => {
  test('folder pane tab interactivity is preserved after workspace switch', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-folder-workspace-switch');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and folder, open folder settings', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createFolder(page, 'TestFolder', 'TestCol');
      await openfolder(page, 'TestCol', 'TestFolder', { persist: true });
      await selectfolderPaneTab(page, 'auth');
    });

    await test.step('Switch to a new workspace', async () => {
      await page.waitForTimeout(1000);
      await createWorkspace(page, 'SecondWorkspace');
      await expect(page.getByTestId('workspace-name')).toHaveText('SecondWorkspace', { timeout: 5000 });
    });

    await test.step('Switch back to original workspace and verify folder pane interactivity', async () => {
      await switchWorkspace(page, 'My Workspace');
      await openfolder(page, 'TestCol', 'TestFolder', { persist: true });

      await focusFolderSettingsTab(page, 'TestFolder');

      await selectfolderPaneTab(page, 'auth');
      await selectfolderPaneTab(page, 'headers');
      await selectfolderPaneTab(page, 'docs');
      await selectfolderPaneTab(page, 'script');
      await selectfolderPaneTab(page, 'vars');
    });

    await closeElectronApp(app);
  });

  test('folder pane tab interactivity is preserved after app restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-folder-restart');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and folder, open folder settings on auth tab', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createFolder(page, 'TestFolder', 'TestCol');
      await openfolder(page, 'TestCol', 'TestFolder', { persist: true });
      await selectfolderPaneTab(page, 'auth');
    });

    await test.step('Close app and verify snapshot stores folder-settings tab', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      await waitForSnapshotFile(userDataPath);

      const snapshot = readSnapshot(userDataPath);
      const tab = findSnapshotFolderTab(snapshot, 'TestFolder');
      expect(tab).toBeTruthy();
      expect(tab.type).toBe('folder-settings');
      expect(tab.permanent).toBe(true);
    });

    await test.step('Restart app and verify folder pane interactivity is restored', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await focusFolderSettingsTab(page2, 'TestFolder', { timeout: 15000 });

      await selectfolderPaneTab(page2, 'auth');
      await selectfolderPaneTab(page2, 'headers');
      await selectfolderPaneTab(page2, 'docs');
      await selectfolderPaneTab(page2, 'script');
      await selectfolderPaneTab(page2, 'vars');

      await closeElectronApp(app2);
    });
  });

  test('folder script\'s tabs need to be interactive after app restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-folder-restart');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and folder, open folder settings on auth tab', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createFolder(page, 'TestFolder', 'TestCol');
      await openfolder(page, 'TestCol', 'TestFolder', { persist: true });
      await selectfolderPaneTab(page, 'script');
    });

    await test.step('Close app and verify snapshot stores folder-settings tab', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      await waitForSnapshotFile(userDataPath);

      const snapshot = readSnapshot(userDataPath);
      const tab = findSnapshotFolderTab(snapshot, 'TestFolder');
      expect(tab).toBeTruthy();
      expect(tab.type).toBe('folder-settings');
      expect(tab.permanent).toBe(true);
    });

    await test.step('Restart app and verify folder script pane is interactive', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await focusFolderSettingsTab(page2, 'TestFolder', { timeout: 15000 });

      await selectfolderPaneTab(page2, 'script');

      await selectFolderScriptPaneTab(page2, 'pre-request');
      await selectFolderScriptPaneTab(page2, 'post-response');

      await closeElectronApp(app2);
    });
  });
});
