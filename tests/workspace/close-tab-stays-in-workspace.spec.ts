import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest
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
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

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
});
