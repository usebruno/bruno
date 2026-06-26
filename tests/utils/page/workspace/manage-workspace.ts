import { Page, test } from '../../../../playwright';

import { buildTitleBarLocators } from '../title-bar';

export const buildManageWorkspaceLocators = (page: Page) => ({
  myWorkspaceDropdownItem: () => page.locator('.dropdown-item'),
  manageWorkspaceTitle: () => page.getByText('Manage Workspace', { exact: true }),
  defaultWorkspaceItem: () => page.locator('.workspace-item'),
  moreActionsBtn: () => page.locator('.more-actions-btn'),
  workspaceListItem: () => page.locator('.dropdown-item'),
  terminalSession: () => page.getByTestId('session-list-0'),
  workspaceItem: () => page.locator('.workspace-item'),
  dropdownItem: () => page.locator('.dropdown-item'),
  modalCard: () => page.locator('.bruno-modal-card'),
  workspaceFileNameInput: () => page.locator('#workspace-name'),
  submitRenameBtn: () => page.getByTestId('modal-submit-btn'),
  renamedWorkspaceItem: () => page.getByTestId('workspace-name'),
  submitRemoveBtn: () => page.getByTestId('modal-submit-btn')
});

export const manageWorkspace = async (page: Page) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Open manage workspaces', async () => {
    await buildTitleBarLocators(page).workspaceMenuTrigger().click();
    await locators.myWorkspaceDropdownItem().filter({ hasText: 'Manage workspaces' }).click();
  });
};

export const openTerminalFromWorkspaceActions = async (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  const workspaceItem = locators.defaultWorkspaceItem().filter({ hasText: workspaceName });
  await workspaceItem.locator(locators.moreActionsBtn()).click();
  await locators.workspaceListItem().filter({ hasText: 'Open in Terminal' }).click();
};

export const clickOnMoreActionsButton = async (page: Page, workspaceName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Click on the more actions button', async () => {
    const workspaceItem = locators.workspaceItem().filter({ hasText: workspaceName });
    await workspaceItem.locator(locators.moreActionsBtn()).click();
  });
};

export const renameOrRemoveWorkspaceOnPopup = async (page: Page, optionName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await locators.dropdownItem().filter({ hasText: optionName }).click();
  await locators.modalCard().waitFor({ state: 'visible' });
};

export const enterNewWorkspaceFilename = async (page: Page, workspaceName: string, btnName: string) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Enter a new name for the workspace in the editing field.', async () => {
    await locators.workspaceFileNameInput().fill(workspaceName);
    await locators.submitRenameBtn().filter({ hasText: btnName }).click();
  });
};

export const clickOnRemoveButtonOnPopup = async (page: Page) => {
  const locators = buildManageWorkspaceLocators(page);
  await test.step('Verify the workspace name is updated in the workspace list.', async () => {
    await locators.submitRemoveBtn().click();
  });
};
