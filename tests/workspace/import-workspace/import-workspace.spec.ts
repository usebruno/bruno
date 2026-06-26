import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, waitForReadyPage } from '../../../playwright';
import {
  createWorkspaceZip,
  importWorkspaceFromZip
} from '../../utils/page/workspace/import-workspace';
import { buildTitleBarLocators } from '../../utils/page/title-bar';

type WorkspaceConfig = {
  info?: { name: string; type: string };
};

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Import Workspace', () => {
  test('TC-969: Verify Import workspace from local directory containing valid workspace.zip file', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('import-ws-location');
    const zipDir = await createTmpDir('import-ws-zip');
    const workspaceName = 'Imported WS';
    const zipPath = createWorkspaceZip(zipDir, workspaceName);

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const titleBar = buildTitleBarLocators(page);

    await test.step('Import the workspace zip via the Import Workspace modal', async () => {
      // extractLocation isn't passed as a parameter: the modal pre-fills the seeded default location.
      await importWorkspaceFromZip(page, { zipPath });
    });

    await test.step('Verify success toast is shown', async () => {
      await expect(page.getByText('Workspace imported successfully!')).toBeVisible();
    });

    await test.step('Verify the imported workspace becomes the active workspace', async () => {
      await expect(titleBar.activeWorkspaceName()).toHaveText(workspaceName);
    });

    await test.step('Verify the workspace was extracted to the filesystem', async () => {
      const wsDir = path.join(wsLocation, workspaceName);
      const ymlPath = path.join(wsDir, 'workspace.yml');
      expect(fs.existsSync(ymlPath)).toBe(true);

      const wsConfig = yaml.load(fs.readFileSync(ymlPath, 'utf8')) as WorkspaceConfig;
      expect(wsConfig?.info?.name).toBe(workspaceName);
      expect(wsConfig?.info?.type).toBe('workspace');
    });

    await closeElectronApp(app);
  });
});
