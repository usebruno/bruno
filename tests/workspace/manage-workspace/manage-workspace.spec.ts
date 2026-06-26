import { test, expect } from '../../../playwright';
import { createWorkspace } from '../../utils/page/actions';
import {
  clickOnMoreActionsButton,
  manageWorkspace,
  buildManageWorkspaceLocators,
  openTerminalFromWorkspaceActions,
  renameOrRemoveWorkspaceOnPopup,
  enterNewWorkspaceFilename,
  clickOnRemoveButtonOnPopup
} from '../../utils/page/workspace/manage-workspace';

test.describe('Manage workspace', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('Create a workspace', async () => {
      await createWorkspace(page, 'Custom Workspace');
    });

    await test.step('Open manage workspaces', async () => {
      const locators = buildManageWorkspaceLocators(page);
      await manageWorkspace(page);
      await expect(locators.manageWorkspaceTitle()).toBeVisible();
    });
  });

  test.describe('Manage workspace actions-open in terminal', () => {
    test('TC-3109: Verify that the workspace should open terminal from the workspace actions menu', { tag: '@sanity' }, async ({ page }) => {
      await openTerminalFromWorkspaceActions(page, 'Custom Workspace');
      const locators = buildManageWorkspaceLocators(page);
      await expect(locators.terminalSession()).toBeVisible();
      await expect(locators.terminalSession()).toContainText('Custom Workspace');
    });
  });

  test.describe('Manage workspace actions-rename workspace', () => {
    test('TC-2612: Verify renaming a workspace from manage workspace section.', { tag: '@sanity' }, async ({ page }) => {
      const locators = buildManageWorkspaceLocators(page);
      await clickOnMoreActionsButton(page, 'Custom Workspace');
      await renameOrRemoveWorkspaceOnPopup(page, 'Rename');
      await enterNewWorkspaceFilename(page, 'New Workspace Name', 'Rename');
      await expect(locators.renamedWorkspaceItem()).toHaveText('New Workspace Name');
      await expect(locators.workspaceItem().filter({ hasText: 'New Workspace Name' })).toBeVisible();
    });
  });

  test.describe('Manage Workspace Actions - Remove Workspace', () => {
    test('TC-2611: Verify removing a Workspace from manage workspace section', { tag: '@sanity' }, async ({ page }) => {
      const locators = buildManageWorkspaceLocators(page);
      await clickOnMoreActionsButton(page, 'Custom Workspace');
      await renameOrRemoveWorkspaceOnPopup(page, 'Remove');
      await clickOnRemoveButtonOnPopup(page);
      await expect(locators.workspaceItem().filter({ hasText: 'Custom Workspace' })).not.toBeVisible({ timeout: 10000 });
    });
  });
});
