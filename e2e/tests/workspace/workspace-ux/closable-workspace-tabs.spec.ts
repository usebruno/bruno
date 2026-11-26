import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, createTransientRequestFromPreset } from '../../../pages';
import { openWorkspaceEnvironmentsTab, SELECT_MODIFIER } from '../../../pages/environment/environment';
import { waitForReadyPage } from '../../../utils';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Closable workspace tabs', () => {
  test('Overview and Environments close like any tab, and closing every tab shows the start page', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('closable-workspace-tabs');
    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { tabs, startPage, titleBar } = buildCommonLocators(page);
    const overviewTab = tabs.workspaceTab('workspaceOverview');
    const environmentsTab = tabs.workspaceTab('workspaceEnvironments');

    try {
      await test.step('The workspace opens on Overview, which has a close button', async () => {
        await expect(overviewTab).toBeVisible();
        await expect(tabs.closeTabIcon(overviewTab)).toHaveCount(1);
      });

      await test.step('Environments closes with its close button and focus returns to Overview', async () => {
        await openWorkspaceEnvironmentsTab(page);
        await expect(tabs.closeTabIcon(environmentsTab)).toHaveCount(1);

        await tabs.closeTabIcon(environmentsTab).click({ force: true });

        await expect(environmentsTab).toHaveCount(0);
        await expect(tabs.activeRequestTab()).toContainText('Overview');
      });

      await test.step('Closing the last tab with the keyboard shows the start page', async () => {
        await page.keyboard.press(`${SELECT_MODIFIER}+w`);

        await expect(overviewTab).toHaveCount(0);
        await expect(startPage.root()).toBeVisible();
        await expect(tabs.activeRequestTab()).toHaveCount(0);
      });

      await test.step('The Home button brings Overview back', async () => {
        await titleBar.homeButton().click();

        await expect(overviewTab).toBeVisible();
        await expect(startPage.root()).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('closing a workspace with an unsaved request open returns to the default workspace without crashing', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('closable-workspace-tabs-transient');
    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { tabs, startPage, collectionHeader, modal, titleBar, appCrashScreen } = buildCommonLocators(page);
    const overviewTab = tabs.workspaceTab('workspaceOverview');

    try {
      await test.step('Create a second workspace from the start page', async () => {
        await expect(overviewTab).toBeVisible();
        await page.keyboard.press(`${SELECT_MODIFIER}+w`);
        await startPage.createButton('workspace').click();
        await expect(overviewTab).toBeVisible();

        const nameInput = collectionHeader.workspaceNameInput();
        await expect(nameInput).toBeVisible();
        await nameInput.press('Enter');
        await expect(nameInput).toHaveCount(0);
      });

      await createTransientRequestFromPreset(page);

      await test.step('Closing the workspace returns to the default workspace, not the crash screen', async () => {
        await collectionHeader.workspaceActionsTrigger().click();
        await collectionHeader.workspaceActionsItem('remove').click();
        await expect(modal.byTitle('Close Workspace')).toBeVisible();
        await modal.button('Close').click();

        await expect(appCrashScreen()).toHaveCount(0);
        await expect(titleBar.activeWorkspaceName()).toHaveText('My Workspace');
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
