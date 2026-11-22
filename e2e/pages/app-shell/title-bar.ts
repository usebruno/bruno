import { ElectronApplication, Page, test } from '../../playwright';

export const buildTitleBarLocators = (page: Page) => ({
  workspaceMenuTrigger: () => page.getByTestId('workspace-menu'),
  activeWorkspaceName: () => page.getByTestId('workspace-menu').getByTestId('workspace-name'),
  createWorkspaceOption: () => page.getByTestId('workspace-menu-create-workspace'),
  openWorkspaceOption: () => page.getByTestId('workspace-menu-open-workspace'),
  importWorkspaceOption: () => page.getByTestId('workspace-menu-import-workspace'),
  manageWorkspacesOption: () => page.getByTestId('workspace-menu-manage-workspaces'),
  responseLayoutToggle: () => page.getByTestId('app-titlebar').getByTestId('response-layout-toggle-btn'),
  homeButton: () => page.getByTestId('app-titlebar').getByRole('button', { name: 'Home', exact: true }),
  appMenuButton: () => page.getByTestId('app-titlebar').getByTestId('menu-dropdown'),
  appMenuItem: (itemId: string) => page.getByTestId(`menu-dropdown-${itemId}`)
});

export const clickTitleBarMenuItem = async (page: Page, menuId: string, itemId: string) => {
  await test.step(`Click "${itemId}" in the "${menuId}" menu of the title bar`, async () => {
    const titleBar = buildTitleBarLocators(page);
    await titleBar.appMenuButton().click();
    await titleBar.appMenuItem(menuId).hover();
    await titleBar.appMenuItem(itemId).click();
  });
};

export const clickApplicationMenuItem = async (electronApp: ElectronApplication, menuLabel: string, itemLabel: string) => {
  await test.step(`Click "${menuLabel} > ${itemLabel}" in the application menu`, async () => {
    await electronApp.evaluate(({ Menu }, labels) => {
      const menuItem = Menu.getApplicationMenu()
        ?.items.find((item) => item.label === labels.menuLabel)
        ?.submenu?.items.find((item) => item.label === labels.itemLabel);
      if (!menuItem) {
        throw new Error(`The application menu has no "${labels.menuLabel} > ${labels.itemLabel}" item`);
      }
      menuItem.click();
    }, { menuLabel, itemLabel });
  });
};

export const clickImportWorkspace = async (page: Page) => {
  const titleBar = buildTitleBarLocators(page);
  await test.step('Open workspace menu and click "Import workspace"', async () => {
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.importWorkspaceOption().click();
  });
};

export const clickOpenWorkspace = async (page: Page) => {
  const titleBar = buildTitleBarLocators(page);
  await test.step('Open the workspace menu and click "Open workspace"', async () => {
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.openWorkspaceOption().click();
  });
};

/**
 * Open the Manage Workspace section from the title bar's workspace menu.
 * @param page - The page object
 */
export const openManageWorkspaces = async (page: Page) => {
  await test.step('Open the Manage Workspace section', async () => {
    const titleBar = buildTitleBarLocators(page);
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.manageWorkspacesOption().click();
  });
};
