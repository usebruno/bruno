import { Page, test } from '../../../playwright';

export const buildTitleBarLocators = (page: Page) => ({
  workspaceMenuTrigger: () => page.getByTestId('workspace-menu'),
  activeWorkspaceName: () => page.getByTestId('workspace-name'),
  importWorkspaceOption: () => page.getByTestId('workspace-menu-import-workspace'),
  workspaceMenuOption: (name?: string) => {
    const rows = page.locator('.dropdown-item');
    return name ? rows.filter({ hasText: name }) : rows;
  }
});

export const clickImportWorkspace = async (page: Page) => {
  const titleBar = buildTitleBarLocators(page);
  await test.step('Open workspace menu and click "Import workspace"', async () => {
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.importWorkspaceOption().click();
  });
};
