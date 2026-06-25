import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, waitForReadyPage } from '../../../playwright';
import { findWorkspaceDirByName, WorkspaceConfig } from '../../utils/helpers';
import {
  buildImportWorkspaceLocators,
  createWorkspaceZip,
  importWorkspaceFromZip
} from '../../utils/page/actions/workspace';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Import Workspace', () => {
  // TC-969: Import workspace from local directory containing a valid workspace.zip file
  test('TC-969: Verify Import workspace from local directory containing valid workspace.zip file', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('import-ws-location');
    const zipDir = await createTmpDir('import-ws-zip');
    const workspaceName = 'Imported WS';
    const zipPath = createWorkspaceZip(zipDir, workspaceName);

    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const locators = buildImportWorkspaceLocators(page);

    await test.step('Import the workspace zip via the Import Workspace modal', async () => {
      // extractLocation isn't passed as a parameter: the modal pre-fills the seeded default location.
      await importWorkspaceFromZip(page, { zipPath });
    });

    await test.step('Verify success toast is shown', async () => {
      await expect(page.getByText('Workspace imported successfully!')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify the imported workspace becomes the active workspace', async () => {
      await expect(locators.activeWorkspaceName()).toHaveText(workspaceName, { timeout: 5000 });
    });

    await test.step('Verify the workspace was extracted to the filesystem', async () => {
      const wsDir = await findWorkspaceDirByName(wsLocation, workspaceName);
      expect(wsDir).not.toBeNull();

      const config = yaml.load(
        fs.readFileSync(path.join(wsDir!, 'workspace.yml'), 'utf8')
      ) as WorkspaceConfig;
      expect(config?.info?.name).toBe(workspaceName);
      expect(config?.info?.type).toBe('workspace');
    });

    await closeElectronApp(app);
  });
});
