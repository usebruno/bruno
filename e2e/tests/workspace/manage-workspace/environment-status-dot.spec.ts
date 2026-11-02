import { test, expect } from '@e2e/test';
import {
  addRowToActiveTab,
  buildCommonLocators,
  addDotEnvVariable,
  createDotEnvFile,
  createEnvironmentFromSidebar,
  openWorkspaceEnvironmentsTab
} from '@e2e/pages';

test.describe('Workspace Environments status dot', () => {
  test('TC-3275: Verify environment status dot icon in workspace Environments tab', async ({
    page
  }) => {
    const { environment } = buildCommonLocators(page);

    await test.step('Environments tab lists workspace environments and .env files', async () => {
      await openWorkspaceEnvironmentsTab(page);
      await createEnvironmentFromSidebar(page, 'Staging');
      await createDotEnvFile(page, '.env');

      await expect(environment.sidebarListItem('global', 'Staging')).toBeVisible();
      await expect(environment.dotEnvFileItem('.env')).toBeVisible();
      await expect(environment.workspaceEnvTabDraftIcon()).toBeHidden();
    });

    await test.step('Adding a variable to an environment shows the status dot on the tab', async () => {
      await environment.sidebarListItem('global', 'Staging').click();
      await addRowToActiveTab(page, 'statusDotVar', 'dot-value');

      await expect(environment.workspaceEnvTabDraftIcon()).toBeVisible();
    });

    await test.step('Resetting the environment clears the status dot', async () => {
      await environment.resetButton().click();

      await expect(environment.workspaceEnvTabDraftIcon()).toBeHidden();
    });

    await test.step('Adding a variable to a .env file shows the status dot on the tab', async () => {
      await environment.dotEnvFileItem('.env').click();
      await addDotEnvVariable(page, 'DOT_ENV_VAR', 'dotenv-value');

      await expect(environment.workspaceEnvTabDraftIcon()).toBeVisible();
    });
  });
});
