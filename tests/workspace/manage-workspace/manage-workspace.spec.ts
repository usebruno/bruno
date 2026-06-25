import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';
import { createWorkspace } from '../../utils/page/actions';

test.describe('Manage Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('Create a workspace', async () => {
      await createWorkspace(page, 'Custom Workspace');
    });

    await test.step('Open Manage Workspaces', async () => {
      await page.locator('.workspace-name-container').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Manage workspaces' }).click();
      await expect(page.getByText('Manage Workspace', { exact: true })).toBeVisible();
    });
  });

  test.describe('Manage Workspace Actions - Open in Terminal', () => {
    test('should open terminal from the workspace actions menu', async ({ page }) => {
      await test.step('Verify default workspace has no actions menu', async () => {
        const defaultWorkspaceItem = page.locator('.workspace-item').filter({ hasText: 'My Workspace' });
        await expect(defaultWorkspaceItem.locator('.more-actions-btn')).toHaveCount(0);
      });

      await test.step('Open terminal from workspace actions', async () => {
        const workspaceItem = page.locator('.workspace-item').filter({ hasText: 'Custom Workspace' });
        await expect(workspaceItem).toBeVisible();
        await workspaceItem.locator('.more-actions-btn').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Open in Terminal' }).click();
      });

      await test.step('Verify terminal session opens at the workspace folder', async () => {
        const terminalSession = page.getByTestId('session-list-0');
        await expect(terminalSession).toBeVisible();
        await expect(terminalSession).toContainText('Custom Workspace');
      });
    });
  });

  test.describe('Manage Workspace Actions - Rename Workspace', () => {
    test('Verify renaming a workspace from manage workspace section.', { tag: '@sanity' }, async ({ page }) => {
      const workspaceItem = page.locator('.workspace-item').filter({
        has: page.locator('.workspace-name', { hasText: 'Custom Workspace' })
      });
      await expect(workspaceItem).toBeVisible();

      await test.step('Click on the more actions button', async () => {
        await workspaceItem.locator('.more-actions-btn').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Rename' }).click();
        await expect(page.locator('.bruno-modal-card')).toBeVisible();
      });

      await test.step('Enter a new name for the workspace in the editing field.', async () => {
        const workspaceNameInput = page.locator('#workspace-name');
        await expect(workspaceNameInput).toBeVisible();
        await workspaceNameInput.fill('New Workspace Name');
        await page.getByTestId('modal-submit-btn').filter({ hasText: 'Rename' }).click();
      });

      await test.step('Verify the workspace name is updated in the workspace list.', async () => {
        const renamedWorkspaceName = page.getByTestId('workspace-name');
        await expect(renamedWorkspaceName).toHaveText('New Workspace Name');
        const manageWorkspaceItem = page.locator('.workspace-item').filter({
          has: page.locator('.workspace-name', { hasText: 'New Workspace Name' })
        });
        await expect(manageWorkspaceItem).toBeVisible();
      });
    });
  });

  test.describe('Manage Workspace Actions - Remove Workspace', () => {
    test('Verify removing a Workspace from manage workspace section', { tag: '@sanity' }, async ({ page }) => {
      const workspaceItem = page.locator('.workspace-item').filter({
        has: page.locator('.workspace-name', { hasText: 'Custom Workspace' })
      });
      await expect(workspaceItem).toBeVisible();

      await test.step('Click on the 3 dots icon on the workspace you want to remove', async () => {
        await workspaceItem.locator('.more-actions-btn').click();
        await expect(page.getByTestId('menu-dropdown-dropdown')).toBeVisible();
        await page.getByTestId('menu-dropdown-remove').click();
        await expect(page.locator('.bruno-modal-card')).toBeVisible();
        await expect(page.locator('.bruno-modal-content span').first()).toHaveText('Custom Workspace');
      });

      await test.step('Click on the Remove button in the modal.', async () => {
        await page.getByTestId('modal-submit-btn').click();
        await expect(page.locator('.workspace-item').filter({ hasText: 'Custom Workspace' })).not.toBeVisible({ timeout: 10000 });
      });
    });
  });
});
