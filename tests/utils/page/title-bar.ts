import { Page, test } from '../../../playwright';

export const buildTitleBarLocators = (page: Page) => ({
  workspaceMenuTrigger: () => page.getByTestId('workspace-menu'),
  activeWorkspaceName: () => page.getByTestId('workspace-menu').getByTestId('workspace-name'),
  importWorkspaceOption: () => page.getByTestId('workspace-menu-import-workspace'),
  manageWorkspacesOption: () => page.getByTestId('workspace-menu-manage-workspaces')
});

export const clickImportWorkspace = async (page: Page) => {
  const titleBar = buildTitleBarLocators(page);
  await test.step('Open workspace menu and click "Import workspace"', async () => {
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.importWorkspaceOption().click();
  });
};
