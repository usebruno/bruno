import path from 'path';
import { ElectronApplication, Page, test } from '../../../../playwright';
import { buildCommonLocators } from '../locators';
import { buildTitleBarLocators } from '../title-bar';

export const initUserDataPath = path.join(__dirname, '../../../workspace/open-workspace/init-user-data');
export const WORKSPACE_NAME = 'my-workspace';

type OpenWorkspaceDialogOptions = {
  canceled: boolean;
  filePaths: string[];
};

export const stubElectronOpenDialog = async (
  app: ElectronApplication,
  options: OpenWorkspaceDialogOptions
) => {
  await app.evaluate(({ dialog }, { canceled, filePaths }) => {
    (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
      Promise.resolve({ canceled, filePaths });
  }, options);
};

export const triggerOpenWorkspaceFromMenu = async (page: Page) => {
  const commLocators = buildCommonLocators(page);
  const titleBarLocators = buildTitleBarLocators(page);
  await test.step('Open Workspace from My Workspace menu', async () => {
    await titleBarLocators.workspaceMenuTrigger().click();
    await commLocators.dropdown.item('Open workspace').click();
  });
};

type OpenWorkspaceOptions = OpenWorkspaceDialogOptions & {
  app: ElectronApplication;
};

export const openWorkspaceFromMenu = async (page: Page, opts: OpenWorkspaceOptions) => {
  await stubElectronOpenDialog(opts.app, { canceled: opts.canceled, filePaths: opts.filePaths });
  await triggerOpenWorkspaceFromMenu(page);
};
