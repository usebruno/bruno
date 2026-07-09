import { test, expect } from '../../../playwright';
import { createWorkspace, removeWorkspace } from '../../utils/page/actions';
import { buildTerminalLocators } from '../../utils/page/devtools/terminal';
import {
  openWorkspaceActionsMenu,
  openManageWorkspace,
  buildManageWorkspaceLocators,
  openTerminalFromWorkspaceActions,
  selectWorkspaceAction,
  enterNewWorkspaceNameAndSubmit,
  confirmRemoveWorkspace
} from '../../utils/page/workspace/manage-workspace';

const workspaceName = 'Custom Workspace';

test.describe('Manage workspace', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('Create a workspace', async () => {
      await createWorkspace(page, workspaceName);
    });
    const locators = buildManageWorkspaceLocators(page);
    await openManageWorkspace(page);
    await locators.manageWorkspaceTitle().waitFor({ state: 'visible' });
  });

  test.afterEach(async ({ page }) => {
    await removeWorkspace(page, workspaceName);
  });

  test.describe('Open terminal from workspace actions menu', () => {
    test('TC-3109: Verify opening terminal from workspace actions menu', { tag: '@sanity' }, async ({ page }) => {
      await openTerminalFromWorkspaceActions(page, workspaceName);
      const terminalLocators = buildTerminalLocators(page);
      await expect(terminalLocators.terminalSession()).toBeVisible();
      await expect(terminalLocators.terminalSession()).toContainText('Custom Workspace');
    });
  });

  test.describe('Rename workspace from manage workspace actions', () => {
    test('TC-2612: Verify renaming a workspace from manage workspace section.', { tag: '@sanity' }, async ({ page }) => {
      const locators = buildManageWorkspaceLocators(page);
      await openWorkspaceActionsMenu(page, workspaceName);
      await selectWorkspaceAction(page, 'Rename');
      await enterNewWorkspaceNameAndSubmit(page, 'New Workspace Name');
      await expect(locators.activeWorkspaceName()).toHaveText('New Workspace Name');
      await expect(locators.workspaceItems('New Workspace Name')).toBeVisible();
    });
  });

  test.describe('Remove workspace from manage workspace actions', () => {
    test('TC-2611: Verify removing a Workspace from manage workspace section', { tag: '@sanity' }, async ({ page }) => {
      const locators = buildManageWorkspaceLocators(page);
      await openWorkspaceActionsMenu(page, workspaceName);
      await selectWorkspaceAction(page, 'Remove');
      await confirmRemoveWorkspace(page);
      await expect(locators.workspaceItems(workspaceName)).not.toBeVisible();
    });
  });
});
