import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  waitForReadyPage
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const WORKSPACE_YML_WORKSPACEB = [
  'opencollection: 1.0.0',
  'info:',
  '  name: WorkspaceB',
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

test.describe('Close tab stays in workspace', () => {
  test('after closing last request tab in WorkspaceB, active tab is not from WorkspaceA and workspace stays WorkspaceB', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('close-tab-two-workspace');
    const colAPath = await createTmpDir('col-a');
    const colBPath = await createTmpDir('col-b');
    const workspaceBPath = await createTmpDir('workspace-b');
    fs.writeFileSync(path.join(workspaceBPath, 'workspace.yml'), WORKSPACE_YML_WORKSPACEB);

    let app;
    try {
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      await test.step('Create ColA/ReqA in default workspace and open ReqA', async () => {
        await createCollection(page, 'ColA', colAPath);
        await createRequest(page, 'ReqA', 'ColA', { url: 'https://echo.usebruno.com', method: 'GET' });
        await openRequest(page, 'ColA', 'ReqA');
        const locators = buildCommonLocators(page);
        await expect(locators.tabs.activeRequestTab()).toContainText('ReqA');
        await locators.request.sendButton().click();
        await expect(locators.response.statusCode()).toBeVisible({ timeout: 10000 });
      });

      await test.step('Stub open-dialog and switch to WorkspaceB', async () => {
        await app.evaluate(
          ({ dialog }, targetPath: string) => {
            (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
              Promise.resolve({ canceled: false, filePaths: [targetPath] });
          },
          workspaceBPath
        );
        await page.getByTestId('workspace-menu').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
        await expect(page.getByTestId('workspace-name')).toHaveText('WorkspaceB', { timeout: 10000 });
      });

      await test.step('Create ColB/ReqB in WorkspaceB and open ReqB', async () => {
        await createCollection(page, 'ColB', colBPath);
        await createRequest(page, 'ReqB', 'ColB', { url: 'https://echo.usebruno.com', method: 'GET' });
        await openRequest(page, 'ColB', 'ReqB');
        const locators = buildCommonLocators(page);
        await expect(locators.tabs.activeRequestTab()).toContainText('ReqB');
        await locators.request.sendButton().click();
        await expect(locators.response.statusCode()).toBeVisible({ timeout: 10000 });
      });

      await test.step('Close ReqB tab', async () => {
        const locators = buildCommonLocators(page);
        await locators.tabs.closeTab('ReqB').click({ force: true });
      });

      await test.step('Active tab must not show ReqA and workspace must still be WorkspaceB', async () => {
        const locators = buildCommonLocators(page);
        const activeTab = locators.tabs.activeRequestTab();
        await expect(activeTab).toBeVisible({ timeout: 5000 });
        await expect(activeTab).not.toContainText('ReqA');
        await expect(page.getByTestId('workspace-name')).toHaveText('WorkspaceB');
      });
    } finally {
      if (app) await closeElectronApp(app);
    }
  });

  test('Collection switcher shows per-collection tab counts and switches to an existing tab', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('collection-switcher');
    const colAPath = await createTmpDir('switcher-col-a');
    const colBPath = await createTmpDir('switcher-col-b');

    let app;
    try {
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      const switcher = page.getByTestId('workspace-switcher-name');
      const switcherItem = (name: string) =>
        page.locator('.dropdown-item').filter({ has: page.locator('.collection-header-dropdown-label', { hasText: name }) });
      const badgeFor = (name: string) => switcherItem(name).locator('.dropdown-tab-count');
      const openSwitcher = async () => {
        await switcher.click();
        await expect(switcherItem('SwitchColA')).toBeVisible();
      };

      await test.step('Create SwitchColA with two open requests and SwitchColB with one', async () => {
        await createCollection(page, 'SwitchColA', colAPath);
        await createRequest(page, 'SwitchReqA1', 'SwitchColA', { url: 'https://echo.usebruno.com', method: 'GET' });
        await createRequest(page, 'SwitchReqA2', 'SwitchColA', { url: 'https://echo.usebruno.com', method: 'GET' });
        await openRequest(page, 'SwitchColA', 'SwitchReqA1', { persist: true });
        await openRequest(page, 'SwitchColA', 'SwitchReqA2', { persist: true });

        await createCollection(page, 'SwitchColB', colBPath);
        await createRequest(page, 'SwitchReqB1', 'SwitchColB', { url: 'https://echo.usebruno.com', method: 'GET' });
        await openRequest(page, 'SwitchColB', 'SwitchReqB1', { persist: true });

        await expect(switcher).toHaveText('SwitchColB');
      });

      let colATabCount = 0;

      await test.step('Both collections are listed, each badge matching that collection\'s tab strip', async () => {
        // The tab strip shows only the active collection's tabs, which is the same set the badge counts.
        const colBTabCount = await locators.tabs.allRequestTabs().count();

        await openSwitcher();
        await expect(switcherItem('SwitchColB')).toBeVisible();
        await expect(badgeFor('SwitchColB')).toHaveText(String(colBTabCount));

        colATabCount = Number(await badgeFor('SwitchColA').innerText());
        expect(colATabCount).toBeGreaterThanOrEqual(2);
      });

      await test.step('Selecting SwitchColA focuses one of its existing tabs without opening a new one', async () => {
        await switcherItem('SwitchColA').click();

        await expect(switcher).toHaveText('SwitchColA');
        await expect(locators.tabs.allRequestTabs()).toHaveCount(colATabCount);
      });

      await test.step('Closing a SwitchColA tab lowers its badge', async () => {
        await locators.tabs.closeTab('SwitchReqA2').click({ force: true });
        await expect(locators.tabs.requestTab('SwitchReqA2')).toHaveCount(0);

        await openSwitcher();
        await expect(badgeFor('SwitchColA')).toHaveText(String(colATabCount - 1));
      });
    } finally {
      if (app) await closeElectronApp(app);
    }
  });
});
