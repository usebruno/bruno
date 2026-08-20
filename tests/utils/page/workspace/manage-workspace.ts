import { expect, Page, test } from '../../../../playwright';
import { buildTitleBarLocators } from '../title-bar';

type WorkspaceAction = 'open-in-terminal' | 'rename' | 'remove';

/**
 * Manage Workspace section locators.
 */
export const buildManageWorkspaceLocators = (page: Page) => {
  // Match on the name element rather than the row's text: a row also renders the
  // workspace path, and renaming a workspace leaves its folder (and therefore the
  // old name) in that path.
  const workspaceItem = (workspaceName: string) =>
    page.locator('.workspace-list .workspace-item').filter({
      has: page.locator('.workspace-name', { hasText: workspaceName })
    });

  const modal = (title: string) =>
    page.locator('.bruno-modal').filter({
      has: page.locator('.bruno-modal-header-title').filter({ hasText: title })
    });

  return {
    title: () => page.locator('.manage-workspace-header .header-title'),
    backButton: () => page.locator('.manage-workspace-header .back-button'),
    createWorkspaceButton: () =>
      page.locator('.manage-workspace-header').getByRole('button', { name: 'Create Workspace' }),
    workspaceItems: () => page.locator('.workspace-list .workspace-item'),
    workspaceItem,
    workspaceName: (workspaceName: string) => workspaceItem(workspaceName).locator('.workspace-name'),
    workspacePath: (workspaceName: string) => workspaceItem(workspaceName).locator('.workspace-path'),
    defaultBadge: (workspaceName: string) => workspaceItem(workspaceName).locator('.default-badge'),
    openButton: (workspaceName: string) => workspaceItem(workspaceName).getByRole('button', { name: 'Open' }),
    // The default workspace renders no actions menu — assert on its count to cover that.
    actionsTrigger: (workspaceName: string) => workspaceItem(workspaceName).locator('.more-actions-btn'),
    // Menu items live in a tippy portal, so they can't be scoped to the workspace row.
    actionsMenuItem: (action: WorkspaceAction) => page.getByTestId(`menu-dropdown-${action}`),
    renameModal: () => modal('Rename Workspace'),
    renameNameInput: () => modal('Rename Workspace').locator('#workspace-name'),
    renameError: () => modal('Rename Workspace').locator('.text-red-500'),
    renameSubmitButton: () => modal('Rename Workspace').getByRole('button', { name: 'Rename', exact: true }),
    removeModal: () => modal('Remove Workspace'),
    removeSubmitButton: () => modal('Remove Workspace').getByRole('button', { name: 'Remove', exact: true })
  };
};

/**
 * Navigate to the Manage Workspace section from the title bar's workspace menu.
 * @param page - The page object
 */
export const openManageWorkspaces = async (page: Page) => {
  await test.step('Open the Manage Workspace section', async () => {
    const titleBar = buildTitleBarLocators(page);
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.manageWorkspacesOption().click();
    await expect(buildManageWorkspaceLocators(page).title()).toBeVisible();
  });
};

/**
 * Open the "..." actions menu of a workspace row in the Manage Workspace section.
 * @param page - The page object
 * @param workspaceName - Name of the workspace whose menu should open
 */
export const openWorkspaceActionsMenu = async (page: Page, workspaceName: string) => {
  await test.step(`Open the actions menu of workspace "${workspaceName}"`, async () => {
    const manageWorkspace = buildManageWorkspaceLocators(page);
    await expect(manageWorkspace.workspaceItem(workspaceName)).toBeVisible();
    await manageWorkspace.actionsTrigger(workspaceName).click();
  });
};
