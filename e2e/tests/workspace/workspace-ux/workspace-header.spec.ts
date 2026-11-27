import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, createWorkspace, switchWorkspace } from '../../../pages';
import { openWorkspaceEnvironmentsTab } from '../../../pages/environment/environment';
import { waitForReadyPage } from '../../../utils';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Workspace header', () => {
  test('shows a global-only environment selector and the workspace actions on the right', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('workspace-header');
    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { tabs, collectionHeader, environment } = buildCommonLocators(page);
    const overviewTab = tabs.workspaceTab('workspaceOverview');

    try {
      await test.step('Create a workspace', async () => {
        await createWorkspace(page, 'Header WS');
      });

      await test.step('The environment selector offers only global environments', async () => {
        await collectionHeader.envSelectorTrigger().click();

        await expect(collectionHeader.envSelectorGlobalTitle()).toBeVisible();
        await expect(environment.collectionTab()).toHaveCount(0);

        await page.keyboard.press('Escape');
      });

      await test.step('The workspace actions sit on the right and list the new items', async () => {
        await expect(collectionHeader.workspaceActionsTrigger()).toBeVisible();
        await collectionHeader.workspaceActionsTrigger().click();

        await expect(collectionHeader.workspaceActionsItem('overview')).toBeVisible();
        await expect(collectionHeader.workspaceActionsItem('terminal')).toBeVisible();
        await expect(collectionHeader.workspaceActionsItem('delete')).toHaveClass(/delete-item/);

        await page.keyboard.press('Escape');
      });

      await test.step('"Workspace Overview" reopens a closed Overview', async () => {
        await openWorkspaceEnvironmentsTab(page);
        await tabs.closeTabIcon(overviewTab).click({ force: true });
        await expect(overviewTab).toHaveCount(0);

        await collectionHeader.workspaceActionsTrigger().click();
        await collectionHeader.workspaceActionsItem('overview').click();

        await expect(tabs.activeRequestTab()).toContainText('Overview');
      });

      await test.step('The default workspace has the selector but no workspace actions', async () => {
        await switchWorkspace(page, 'My Workspace');

        await expect(collectionHeader.envSelectorTrigger()).toBeVisible();
        await expect(collectionHeader.workspaceActionsTrigger()).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
