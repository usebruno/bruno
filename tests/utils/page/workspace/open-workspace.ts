import { ElectronApplication, Page, test } from '../../../../playwright';
import { buildTitleBarLocators } from '../title-bar';

/**
 * Stub the native directory picker so the next `showOpenDialog` resolves to `filePaths`.
 * Pass no paths to simulate the user cancelling the dialog.
 */
export const stubOpenDirectoryDialog = async (app: ElectronApplication, ...filePaths: string[]) => {
  await app.evaluate(({ dialog }, paths: string[]) => {
    (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
      Promise.resolve({ canceled: paths.length === 0, filePaths: paths });
  }, filePaths);
};

/**
 * Open the workspace menu from the title bar and click "Open workspace".
 */
export const clickOpenWorkspace = async (page: Page) => {
  const titleBar = buildTitleBarLocators(page);
  await test.step('Open the workspace menu and click "Open workspace"', async () => {
    await titleBar.workspaceMenuTrigger().click();
    await titleBar.openWorkspaceOption().click();
  });
};
