import path from 'path';
import { test, expect } from '../../../playwright';
import { Page } from '@playwright/test';

/**
 * Helper function to select a workspace from the dropdown
 */
async function selectWorkspace(page: Page, workspaceName: string) {
  await test.step(`Select workspace "${workspaceName}"`, async () => {
    // Click on workspace name to open dropdown
    await page.locator('.workspace-name-container').click();

    // Wait for dropdown to appear
    await page.locator('.tippy-box').waitFor({ state: 'visible' });

    // Click on the workspace item
    const workspaceItem = page.locator('.workspace-item').filter({ hasText: workspaceName });
    await expect(workspaceItem).toBeVisible();
    await workspaceItem.click();

    // Wait for dropdown to close
    await page.locator('.tippy-box').waitFor({ state: 'hidden' });

    // Verify workspace name appears in title bar
    await expect(page.locator('.workspace-name')).toContainText(workspaceName);
  });
}

/**
 * Helper function to get the current active workspace name
 */
async function getActiveWorkspaceName(page: Page): Promise<string> {
  const workspaceNameElement = page.locator('.workspace-name');
  await expect(workspaceNameElement).toBeVisible();
  return await workspaceNameElement.textContent() || '';
}

// All workspace names available in fixtures
const allWorkspaceNames = ['My Workspace', 'Workspace1', 'Workspace2', 'Workspace3', 'Workspace4', 'Workspace5'];

test.describe('Workspace Persistence', () => {
  test.setTimeout(2 * 60 * 1000); // 2 minutes - test runs 5 iterations with app restarts

  test('should persist active workspace selection across app restarts', async ({ restartAppWithPersistentState }) => {
    let previousWorkspaceName: string = 'My Workspace';

    // Repeat the test 5 times
    for (let iteration = 1; iteration <= 5; iteration++) {
      await test.step(`Iteration ${iteration}: Verify previous workspace persisted and select new one`, async () => {
        // Launch app with pre-created workspaces from fixtures
        // restartAppWithPersistentState automatically uses init-user-data from the test directory
        // and preserves state across restarts
        const app = await restartAppWithPersistentState();
        const page = await app.firstWindow();

        await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
        const activeWorkspaceName = await getActiveWorkspaceName(page);
        expect(activeWorkspaceName.toLowerCase()).toContain(previousWorkspaceName.toLowerCase());

        // Select a random workspace (different from the current one)
        let selectedWorkspaceName: string;
        do {
          const randomIndex = Math.floor(Math.random() * allWorkspaceNames.length);
          selectedWorkspaceName = allWorkspaceNames[randomIndex];
        } while (selectedWorkspaceName === previousWorkspaceName);

        await selectWorkspace(page, selectedWorkspaceName);

        // Verify it's selected
        const activeName = await getActiveWorkspaceName(page);
        expect(activeName.toLowerCase()).toContain(selectedWorkspaceName.toLowerCase());

        // Store for next iteration
        previousWorkspaceName = selectedWorkspaceName;

        // Wait before closing to ensure state is saved
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Close the app gracefully (following pattern from other tests)
        await app.context().close();
        await app.close();

        // Wait a bit for the app to fully close and cleanup
        if (iteration < 5) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      });
    }
  });
});
