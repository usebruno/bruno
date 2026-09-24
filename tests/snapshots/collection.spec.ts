import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createWorkspace,
  focusCollectionSettingsTab,
  openCollectionSettings,
  readSnapshot,
  findSnapshotCollectionTab,
  selectCollectionPaneTab,
  selectCollectionScriptPaneTab,
  switchWorkspace,
  waitForReadyPage,
  waitForSnapshotFile
} from '../utils/page';

test.describe('Snapshot: collection Pane Interactivity', () => {
  test('collection pane tab interactivity is preserved after workspace switch', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-collection-workspace-switch');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and open collection settings', async () => {
      await createCollection(page, 'TestCol', colPath);
      await openCollectionSettings(page, 'TestCol', { persist: true });
      await selectCollectionPaneTab(page, 'auth');
    });

    await test.step('Switch to a new workspace', async () => {
      // Background flushing takes about 2 seconds to complete
      await page.waitForTimeout(2000);
      await createWorkspace(page, 'SecondWorkspace');
      await expect(page.getByTestId('workspace-name')).toHaveText('SecondWorkspace', { timeout: 5000 });
    });

    await test.step('Switch back to original workspace and verify collection pane interactivity', async () => {
      await switchWorkspace(page, 'My Workspace');
      await openCollectionSettings(page, 'TestCol', { persist: true });

      await focusCollectionSettingsTab(page);

      await selectCollectionPaneTab(page, 'auth');
      await selectCollectionPaneTab(page, 'headers');
      await selectCollectionPaneTab(page, 'overview');
      await selectCollectionPaneTab(page, 'script');
      await selectCollectionPaneTab(page, 'vars');
    });

    await closeElectronApp(app);
  });

  test('collection pane tab interactivity is preserved after app restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-collection-restart');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and open collection settings on auth tab', async () => {
      await createCollection(page, 'TestCol', colPath);
      await openCollectionSettings(page, 'TestCol', { persist: true });
      await selectCollectionPaneTab(page, 'auth');
    });

    await test.step('Close app and verify snapshot stores collection-settings tab', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      await waitForSnapshotFile(userDataPath);

      const snapshot = readSnapshot(userDataPath);
      const tab = findSnapshotCollectionTab(snapshot, colPath);
      expect(tab).toBeTruthy();
      expect(tab.type).toBe('collection-settings');
      expect(tab.permanent).toBe(true);
    });

    await test.step('Restart app and verify collection pane interactivity is restored', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await focusCollectionSettingsTab(page2, { timeout: 15000 });

      await selectCollectionPaneTab(page2, 'auth');
      await selectCollectionPaneTab(page2, 'headers');
      await selectCollectionPaneTab(page2, 'overview');
      await selectCollectionPaneTab(page2, 'script');
      await selectCollectionPaneTab(page2, 'vars');

      await closeElectronApp(app2);
    });
  });

  test('collection script\'s tabs need to be interactive after app restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-collection-restart');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and open collection settings on script tab', async () => {
      await createCollection(page, 'TestCol', colPath);
      await openCollectionSettings(page, 'TestCol', { persist: true });
      await selectCollectionPaneTab(page, 'script');
    });

    await test.step('Close app and verify snapshot stores collection-settings tab', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      await waitForSnapshotFile(userDataPath);

      const snapshot = readSnapshot(userDataPath);
      const tab = findSnapshotCollectionTab(snapshot, colPath);
      expect(tab).toBeTruthy();
      expect(tab.type).toBe('collection-settings');
      expect(tab.permanent).toBe(true);
    });

    await test.step('Restart app and verify collection script pane is interactive', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await focusCollectionSettingsTab(page2, { timeout: 15000 });

      await selectCollectionPaneTab(page2, 'script');

      await selectCollectionScriptPaneTab(page2, 'pre-request');
      await selectCollectionScriptPaneTab(page2, 'post-response');

      await closeElectronApp(app2);
    });
  });
});
