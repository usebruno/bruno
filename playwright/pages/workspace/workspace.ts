import { test, expect, Page } from '../..';

/**
 * Create a new workspace via the title bar dropdown inline rename flow
 * @param page - The page object
 * @param workspaceName - The name of the workspace to create
 * @returns void
 */
export const createWorkspace = async (page: Page, workspaceName: string) => {
  await test.step(`Create workspace "${workspaceName}"`, async () => {
    await page.locator('.workspace-name-container').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();

    const renameInput = page.locator('.workspace-name-input');
    await expect(renameInput).toBeVisible({ timeout: 5000 });
    await renameInput.fill(workspaceName);
    await renameInput.press('Enter');

    await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName, { timeout: 5000 });
  });
};

/**
 * Switch to an existing workspace via the title bar dropdown
 * @param page - The page object
 * @param workspaceName - The name of the workspace to switch to
 * @returns void
 */
export const switchWorkspace = async (page: Page, workspaceName: string) => {
  await test.step(`Switch to workspace "${workspaceName}"`, async () => {
    await page.locator('.workspace-name-container').click();
    await page
      .locator('.workspace-item, .dropdown-item')
      .filter({ has: page.getByText(workspaceName, { exact: true }) })
      .click();
    await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName, { timeout: 5000 });
  });
};

export type DialogOptions = {
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
};

export const openWorkspaceFromDialog = async (app: any, page: any, targetPath: string) => {
  await app.evaluate(
    ({ dialog }: { dialog: DialogOptions }, workspacePath: string) => {
      dialog.showOpenDialog = () =>
        Promise.resolve({ canceled: false, filePaths: [workspacePath] });
    },
    targetPath
  );

  await page.getByTestId('workspace-menu').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
};
