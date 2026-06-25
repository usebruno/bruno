// title-bar.ts
import { Page, test } from '../../../playwright';

export const buildWorkspaceTitleBarLocators = (page: Page) => ({
  menuTrigger: () => page.getByTestId('workspace-menu'),
  activeWorkspaceName: () => page.getByTestId('workspace-name'),
  importWorkspaceItem: () => page.getByTestId('workspace-menu-import-workspace')
});

export type WorkspaceTitleBarLocators = ReturnType<typeof buildWorkspaceTitleBarLocators>;

export const clickImportWorkspace = async (page: Page) => {
  const titleBar = buildWorkspaceTitleBarLocators(page);
  await test.step('Open workspace menu and click "Import workspace"', async () => {
    await titleBar.menuTrigger().click();
    await titleBar.importWorkspaceItem().click();
  });
};
