import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { addRowToActiveTab, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  addWorkspaceDotEnvVariable,
  createWorkspaceDotEnvFile,
  createWorkspaceEnvironment,
  openWorkspaceEnvironmentsTab
} from '../../utils/page/workspace/workspace-environments';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Workspace Environments status dot', () => {
  test('TC-3275: Verify environment status dot icon in workspace Environments tab', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const wsLocation = await createTmpDir('ws-location-env-dot');
    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { tabs, workspaceEnvironments } = buildCommonLocators(page);

    try {
      await test.step('Workspace overview loads successfully', async () => {
        await expect(tabs.activeRequestTab()).toContainText('Overview');
      });

      await test.step('Environments tab lists workspace environments and .env files', async () => {
        await openWorkspaceEnvironmentsTab(page);
        await createWorkspaceEnvironment(page, 'Staging');
        await createWorkspaceDotEnvFile(page, '.env');

        await expect(workspaceEnvironments.environmentItem('Staging')).toBeVisible();
        await expect(workspaceEnvironments.dotEnvFileItem('.env')).toBeVisible();
        await expect(workspaceEnvironments.tabDraftIcon()).toBeHidden();
      });

      await test.step('Adding a variable to an environment shows the status dot on the tab', async () => {
        await workspaceEnvironments.environmentItem('Staging').click();
        await addRowToActiveTab(page, 'statusDotVar', 'dot-value');

        await expect(workspaceEnvironments.tabDraftIcon()).toBeVisible();
      });

      await test.step('Resetting the environment clears the status dot', async () => {
        await workspaceEnvironments.resetEnvironmentButton().click();

        await expect(workspaceEnvironments.tabDraftIcon()).toBeHidden();
      });

      await test.step('Adding a variable to a .env file shows the status dot on the tab', async () => {
        await workspaceEnvironments.dotEnvFileItem('.env').click();
        await addWorkspaceDotEnvVariable(page, 'DOT_ENV_VAR', 'dotenv-value');

        await expect(workspaceEnvironments.tabDraftIcon()).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
