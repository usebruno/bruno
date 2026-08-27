import fs from 'fs';
import path from 'path';
import { ElectronApplication, Page, test } from '../../../../playwright';
import { buildTitleBarLocators } from '../title-bar';

/**
 * Create a valid Bruno workspace directory on disk that "Open workspace" will accept.
 * The directory holds a single `workspace.yml` (info.name + info.type: workspace).
 *
 * @param parentDir - directory in which the workspace folder is created
 * @param workspaceName - name embedded in workspace.yml, also used as the folder name
 * @returns absolute path to the created workspace directory
 */
export const createWorkspaceOnDisk = (parentDir: string, workspaceName: string): string => {
  const workspacePath = path.join(parentDir, workspaceName);
  fs.mkdirSync(workspacePath, { recursive: true });

  const workspaceYml = [
    'opencollection: 1.0.0',
    'info:',
    `  name: "${workspaceName}"`,
    '  type: workspace',
    '',
    'collections: []',
    'specs: []',
    'docs: \'\'',
    ''
  ].join('\n');

  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), workspaceYml, 'utf8');
  return workspacePath;
};

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
