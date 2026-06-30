import { Page, test } from '../../../../playwright';

import { buildTitleBarLocators } from '../title-bar';

export const buildManageWorkspaceLocators = (page: Page) => ({
  manageWorkspaceTitle: () => page.getByText('Manage Workspace', { exact: true }),
  // The more actions button in the manage workspace item list.
  moreActionsBtn: () => page.getByTestId('manage-workspace-more-options-btn'),
  // The dropdown item in the manage workspace item list.
  workspaceListItem: (name?: string) => {
    const rows = page.locator('.dropdown-item');
    return name ? rows.filter({ hasText: name }) : rows;
  },
  // The terminal session item in the manage workspace item list.
  terminalSession: (index: number = 0) => page.getByTestId(`session-list-${index}`),
  // The workspace item in the manage workspace item list.
  workspaceItems: (name?: string) => {
    const rows = page.locator('.workspace-item');
    return name ? rows.filter({ hasText: name }) : rows;
  },
  // The modal card in the manage workspace item list.
  modalCard: () => page.locator('.bruno-modal-card'),
  // The workspace file name input in the manage workspace pop up model.
  workspaceFileNameInput: () => page.getByTestId('workspace-name-input'),
  // The submit rename button in the manage workspace pop up model
  submitRenameBtn: () => page.getByTestId('modal-submit-btn'),
  // The renamed workspace item in the manage workspace item list.
  activeWorkspaveName: () => page.getByTestId('workspace-name'),
  // The submit remove button in the manage workspace pop up model
  submitRemoveBtn: () => page.getByTestId('modal-submit-btn')
});

export const openManageWorkspace = async (page: Page) => {
  const titleBar = buildTitleBarLocators(page);
  await test.step('Open manage workspaces', async () => {
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.workspaceMenuOption('Manage workspaces').click();
  });
};

const getWorkspaceItem = (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  // The active workspace is always the most recently created one (last in the list).
  return locators.workspaceItems(workspaceName).last();
};

export const openTerminalFromWorkspaceActions = async (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Open terminal from workspace actions', async () => {
    const workspaceItem = getWorkspaceItem(page, workspaceName);
    await workspaceItem.locator(locators.moreActionsBtn()).click();
    await locators.workspaceListItem('Open in Terminal').click();
  });
};

export const openWorkspaceActionsMenu = async (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Click on the more actions button', async () => {
    const workspaceItem = getWorkspaceItem(page, workspaceName);
    await workspaceItem.locator(locators.moreActionsBtn()).click();
  });
};

export const selectWorkspaceAction = async (page: Page, optionName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Select workspace action on popup', async () => {
    await locators.workspaceListItem(optionName).click();
    await locators.modalCard().waitFor({ state: 'visible' });
  });
};

export const enterNewWorkspaceName = async (page: Page, workspaceName: string, btnName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Enter a new name for the workspace in the editing field.', async () => {
    await locators.workspaceFileNameInput().fill(workspaceName);
    await locators.submitRenameBtn().filter({ hasText: btnName }).click();
  });
};

export const confirmRemoveWorkspace = async (page: Page) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Confirm remove workspace on popup', async () => {
    await locators.submitRemoveBtn().click();
  });
};
