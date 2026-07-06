import { Page, test } from '../../../../playwright';
import { buildCommonLocators } from '../locators';
import { buildTitleBarLocators } from '../title-bar';

export const buildManageWorkspaceLocators = (page: Page) => ({
  manageWorkspaceTitle: () => page.getByText('Manage Workspace', { exact: true }),
  // The more actions button in the manage workspace item list.
  moreActionsBtn: () => page.getByTestId('manage-workspace-more-options-btn'),
  // The dropdown item in the manage workspace item list.
  workspaceDropdownItem: (name?: string) => {
    const rows = page.locator('.dropdown-item');
    return name ? rows.filter({ hasText: name }) : rows;
  },
  // The workspace item in the manage workspace item list.
  workspaceItems: (name?: string) => {
    const rows = page.locator('.workspace-item');
    return name ? rows.filter({ hasText: name }) : rows;
  },
  // The workspace file name input in the manage workspace pop up model.
  workspaceFileRenameInput: () => page.getByTestId('workspace-rename-input'),
  activeWorkspaceName: () => page.getByTestId('workspace-name')
});

export const openManageWorkspace = async (page: Page) => {
  const titleBar = buildTitleBarLocators(page);
  await test.step('Open manage workspaces', async () => {
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.workspaceMenuOption('Manage workspaces').click();
  });
};

export const openTerminalFromWorkspaceActions = async (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Open terminal from workspace actions', async () => {
    await locators.workspaceItems(workspaceName).last().locator(locators.moreActionsBtn()).click();
    await locators.workspaceDropdownItem('Open in Terminal').click();
  });
};

export const openWorkspaceActionsMenu = async (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Click on the more actions button', async () => {
    await locators.workspaceItems(workspaceName).last().locator(locators.moreActionsBtn()).click();
  });
};

export const selectWorkspaceAction = async (page: Page, optionName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  const modal = buildCommonLocators(page);
  await test.step('Select workspace action on popup', async () => {
    await locators.workspaceDropdownItem(optionName).click();
    await modal.modal.card().waitFor({ state: 'visible' });
  });
};

export const enterNewWorkspaceNameAndSubmit = async (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  const modal = buildCommonLocators(page);
  await test.step('Enter a new name for the workspace in the editing field.', async () => {
    await locators.workspaceFileRenameInput().fill(workspaceName);
    await modal.modal.submitButton().click();
  });
};

export const confirmRemoveWorkspace = async (page: Page) => {
  const modal = buildCommonLocators(page);
  await test.step('Confirm remove workspace on popup', async () => {
    await modal.modal.submitButton().click();
  });
};
