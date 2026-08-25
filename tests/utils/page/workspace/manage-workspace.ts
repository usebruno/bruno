import { expect, Page, test } from '../../../../playwright';
import { openManageWorkspaces } from '../title-bar';
import { buildRemoveWorkspaceModalLocators } from './remove-workspace-modal';
import { buildRenameWorkspaceModalLocators } from './rename-workspace-modal';

type WorkspaceAction = 'open-in-terminal' | 'rename' | 'remove';

/**
 * Manage Workspace section locators.
 */
export const buildManageWorkspaceLocators = (page: Page) => {
  const workspaceItem = (workspaceName: string) => page.getByTestId(`workspace-item-${workspaceName}`);

  return {
    title: () => page.getByTestId('manage-workspace-title'),
    backButton: () => page.getByTestId('manage-workspace-back-btn'),
    createWorkspaceButton: () => page.getByTestId('manage-workspace-create'),
    // Every row's testid carries its workspace name, so the prefix matches them all.
    workspaceItems: () => page.getByTestId(/^workspace-item-/),
    workspaceItem,
    workspaceName: (workspaceName: string) => workspaceItem(workspaceName).getByTestId('workspace-row-name'),
    workspacePath: (workspaceName: string) => workspaceItem(workspaceName).getByTestId('workspace-path'),
    defaultBadge: (workspaceName: string) => workspaceItem(workspaceName).getByTestId('workspace-default-badge'),
    openButton: (workspaceName: string) => workspaceItem(workspaceName).getByRole('button', { name: 'Open' }),
    // The default workspace renders no actions menu — assert on its count to cover that.
    actionsTrigger: (workspaceName: string) => workspaceItem(workspaceName).getByTestId('workspace-actions-trigger'),
    // Menu items live in a tippy portal, so they can't be scoped to the workspace row.
    actionsMenuItem: (action: WorkspaceAction) => page.getByTestId(`menu-dropdown-${action}`),
    renameModal: buildRenameWorkspaceModalLocators(page),
    removeModal: buildRemoveWorkspaceModalLocators(page)
  };
};

/**
 * Navigate to the Manage Workspace section from the title bar's workspace menu.
 * @param page - The page object
 */
export const goToManageWorkspace = async (page: Page) => {
  await test.step('Open the Manage Workspace section', async () => {
    await openManageWorkspaces(page);
    await buildManageWorkspaceLocators(page).title().waitFor({ state: 'visible' });
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
    await manageWorkspace.workspaceItem(workspaceName).waitFor({ state: 'visible' });
    await manageWorkspace.actionsTrigger(workspaceName).click();
  });
};
