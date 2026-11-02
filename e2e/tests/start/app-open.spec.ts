import { test, expect } from '../../playwright';

test('Check if the workspace name is visible in the sidebar', async ({ page }) => {
  // Wait for the app to be loaded
  await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

  // Wait for the workspace name container to be visible (contains workspace name like "My Workspace" or "Default Workspace")
  await expect(page.locator('.workspace-name-container')).toBeVisible();
});
