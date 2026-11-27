import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, createWorkspace, openRequest, switchWorkspace } from '../../../pages';
import { readSnapshot, waitForReadyPage } from '../../../utils';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Workspace landing tab', () => {
  test('create and switch land on Overview, and switching back restores the last request', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('lands-on-overview');
    const collectionLocation = await createTmpDir('lands-on-overview-col');
    const userDataPath = await createTmpDir('lands-on-overview-userdata');
    const app = await launchElectronApp({ initUserDataPath, userDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { tabs } = buildCommonLocators(page);
    const snapshot = () => readSnapshot(userDataPath);

    try {
      await test.step('A newly created workspace opens on Overview', async () => {
        await createWorkspace(page, 'Landing WS');
        await expect(tabs.activeRequestTab()).toContainText('Overview');
      });

      await test.step('Open a request in that workspace', async () => {
        await createCollection(page, 'Landing Col', collectionLocation);
        await createRequest(page, 'Landing Req', 'Landing Col', { url: 'https://echo.usebruno.com', method: 'GET' });
        await openRequest(page, 'Landing Col', 'Landing Req', { persist: true });
        await expect(tabs.activeRequestTab()).toContainText('Landing Req');
      });

      await test.step('Switching to a workspace with nothing to restore lands on Overview', async () => {
        // The last active tab is read from the snapshot, which is written on a short debounce
        await expect.poll(() => snapshot()?.workspaces?.find((w) => w.pathname?.includes('Landing WS'))?.lastActiveCollectionPathname)
          .toContain('Landing Col');
        await switchWorkspace(page, 'My Workspace');
        await expect(tabs.activeRequestTab()).toContainText('Overview');
      });

      await test.step('Switching back restores the request that was open', async () => {
        await expect.poll(() => snapshot()?.activeWorkspacePath).not.toContain('Landing WS');
        await switchWorkspace(page, 'Landing WS');
        await expect(tabs.activeRequestTab()).toContainText('Landing Req');
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
