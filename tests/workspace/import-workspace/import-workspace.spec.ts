import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, waitForReadyPage } from '../../../playwright';
import {
  buildImportWorkspaceModalLocators,
  createWorkspaceZip,
  importWorkspaceFromZip
} from '../../utils/page/workspace/import-workspace';

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
    const importwsmodallocators = buildImportWorkspaceModalLocators(page);

    await test.step('Import the workspace zip via the Import Workspace modal', async () => {
      // extractLocation isn't passed as a parameter: the modal pre-fills the seeded default location.
      await importWorkspaceFromZip(page, { zipPath });
    });

    await test.step('Verify success toast is shown', async () => {
      await expect(page.getByText('Workspace imported successfully!')).toBeVisible();
    });

    await test.step('Verify the imported workspace becomes the active workspace', async () => {
      await expect(importwsmodallocators.titleBar.activeWorkspaceName()).toHaveText(workspaceName);
    });

    await test.step('Verify the workspace was extracted to the filesystem', async () => {
      let wsDir: string | undefined;
      for (const entry of fs.readdirSync(wsLocation)) {
        const dir = path.join(wsLocation, entry);
        const ymlPath = path.join(dir, 'workspace.yml');
        if (!fs.existsSync(ymlPath)) continue;
        const wsConfig = yaml.load(fs.readFileSync(ymlPath, 'utf8')) as WorkspaceConfig;
        if (wsConfig?.info?.name === workspaceName) {
          wsDir = dir;
          break;
        }
      }
      expect(wsDir).toBeDefined();

      const config = yaml.load(
        fs.readFileSync(path.join(wsDir!, 'workspace.yml'), 'utf8')
      ) as WorkspaceConfig;
      expect(config?.info?.name).toBe(workspaceName);
      expect(config?.info?.type).toBe('workspace');
    });

    await closeElectronApp(app);
  });
});
