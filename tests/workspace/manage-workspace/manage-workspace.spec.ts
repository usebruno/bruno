import { test, expect } from '../../../playwright';
import { createWorkspace } from '../../utils/page/actions';
import {
  openWorkspaceActionsMenu,
  openManageWorkspace,
  buildManageWorkspaceLocators,
  openTerminalFromWorkspaceActions,
  selectWorkspaceAction,
  enterNewWorkspaceName,
  confirmRemoveWorkspace
} from '../../utils/page/workspace/manage-workspace';

let workspaceName: string;

test.describe('Manage workspace', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    workspaceName = `Custom Workspace ${testInfo.testId.slice(-8)}`;
    await test.step('Create a workspace', async () => {
      await createWorkspace(page, workspaceName);
    });
    const locators = buildManageWorkspaceLocators(page);
    await openManageWorkspace(page);
    await locators.manageWorkspaceTitle().waitFor({ state: 'visible' });
  });

  test.describe('Manage workspace actions-open in terminal', () => {
    test('TC-3109: Verify opening terminal from workspace actions menu', { tag: '@sanity' }, async ({ page }) => {
      await openTerminalFromWorkspaceActions(page, workspaceName);
      const locators = buildManageWorkspaceLocators(page);
      await expect(locators.terminalSession()).toBeVisible();
      await expect(locators.terminalSession()).toContainText('Custom Workspace');
    });
  });

  test.describe('Manage workspace actions-rename workspace', () => {
    test('TC-2612: Verify renaming a workspace from manage workspace section.', { tag: '@sanity' }, async ({ page }) => {
      const locators = buildManageWorkspaceLocators(page);
      await openWorkspaceActionsMenu(page, workspaceName);
      await selectWorkspaceAction(page, 'Rename');
      await enterNewWorkspaceName(page, 'New Workspace Name', 'Rename');
      await expect(locators.activeWorkspaveName()).toHaveText('New Workspace Name');
      await expect(locators.workspaceItems('New Workspace Name')).toBeVisible();
    });
  });

  test.describe('Manage Workspace Actions - Remove Workspace', () => {
    test('TC-2611: Verify removing a Workspace from manage workspace section', { tag: '@sanity' }, async ({ page }) => {
      const locators = buildManageWorkspaceLocators(page);
      await openWorkspaceActionsMenu(page, workspaceName);
      await selectWorkspaceAction(page, 'Remove');
      await confirmRemoveWorkspace(page);
      await expect(locators.workspaceItems(workspaceName)).not.toBeVisible({ timeout: 10000 });
    });
  });
});
