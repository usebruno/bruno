import { Page, expect, test } from '../../../../playwright';

export const buildCreateWorkspaceModalLocators = (page: Page) => {
  const modal = () => page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });

  return {
    modal,
    nameInput: () => modal().locator('#workspace-name'),
    folderNameInput: () => modal().locator('#workspace-folder-name'),
    locationInput: () => modal().locator('#workspace-location'),
    // The folder name is a read-only PathDisplay preview until the edit toggle is used.
    folderNamePreview: () => modal().locator('.name-container'),
    submitButton: () => modal().getByRole('button', { name: 'Create Workspace' })
  };
};

/**
 * Start an inline workspace creation from the title bar, then open the advanced
 * modal via its settings icon.
 * @param page - The page object
 */
export const openCreateWorkspaceModal = async (page: Page) => {
  await test.step('Open the advanced Create Workspace modal', async () => {
    await page.locator('.workspace-name-container').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();
    await expect(page.locator('.workspace-name-input')).toBeVisible({ timeout: 5000 });
    await page.locator('.cog-btn').click();
    await buildCreateWorkspaceModalLocators(page).modal().waitFor({ state: 'visible', timeout: 5000 });
  });
};
