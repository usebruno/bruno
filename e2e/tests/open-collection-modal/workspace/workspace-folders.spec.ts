import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, waitForReadyPage, ElectronApplication, Page } from '../../../playwright';
import { buildCommonLocators } from '../../../pages';
import { buildTitleBarLocators } from '../../../pages/app-shell/title-bar';
import { buildOpenCollectionModalLocators } from '../../../pages/open-collection-modal/shell';
import { buildChooseFolderLocators, chooseFolders } from '../../../pages/open-collection-modal/choose-folder';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';
import { mockBrowseFiles } from '../../../pages/request/body';
import { buildImportWorkspaceModalLocators, createWorkspaceZip } from '../../../pages/workspace/import-workspace';

const writeCollection = (collectionPath: string, name: string) => {
  fs.mkdirSync(collectionPath, { recursive: true });
  fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), yaml.dump({ opencollection: '1.0.0', info: { name } }));
};

const writeWorkspace = (folderPath: string, workspaceName: string, collections: { name: string; path: string }[] = []) => {
  fs.mkdirSync(folderPath, { recursive: true });
  fs.writeFileSync(path.join(folderPath, 'workspace.yml'), yaml.dump({
    opencollection: '1.0.0',
    info: { name: workspaceName, type: 'workspace' },
    collections,
    specs: [],
    docs: ''
  }));
  return folderPath;
};

test.describe('Open collection modal: workspace folders and exports', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async ({ launchElectronApp, createTmpDir }) => {
    app = await launchElectronApp({ userDataPath: await createTmpDir('workspace-folders-user-data') });
    page = await waitForReadyPage(app);
  });

  test.afterEach(async () => {
    await closeElectronApp(app);
  });

  test('lists the collections a picked workspace names and opens it as a workspace', async ({ createTmpDir }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);
    const { sidebar } = buildCommonLocators(page);
    const tmpDir = await createTmpDir('workspace-folder');
    const workspacePath = path.join(tmpDir, 'Petstore');
    const authPath = path.join(tmpDir, 'Shared', 'Auth');

    await test.step('Make a workspace that names a collection inside its folder, one outside it and one that is gone', async () => {
      writeCollection(path.join(workspacePath, 'collections', 'Orders'), 'Orders');
      writeCollection(path.join(workspacePath, 'old', 'Billing copy'), 'Billing copy');
      writeCollection(authPath, 'Auth');
      writeWorkspace(workspacePath, 'Petstore APIs', [
        { name: 'Orders', path: 'collections/Orders' },
        { name: 'Auth', path: authPath },
        { name: 'Gone', path: 'collections/Gone' }
      ]);
    });

    await chooseFolders(page, app, [workspacePath]);

    await test.step('Verify the note offers the workspace above exactly the collections it names', async () => {
      await expect(openCollectionModal.note()).toContainText('These collections are part of the Petstore workspace. 1 of its collections isn’t on this computer.');
      await expect(openCollectionModal.noteActionButton()).toHaveText('Open as workspace');
      await expect(chooseFolder.rows()).toHaveCount(2);
      await expect(chooseFolder.row('Orders')).toBeVisible();
      await expect(chooseFolder.row('Auth')).toBeVisible();
    });

    await test.step('Click Open as workspace', async () => {
      await openCollectionModal.noteActionButton().click();
    });

    await test.step('Verify the workspace is open with the same collections', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(buildTitleBarLocators(page).activeWorkspaceName()).toHaveText('Petstore APIs');
      await expect(sidebar.collection('Orders')).toBeVisible();
      await expect(sidebar.collection('Auth')).toBeVisible();
      await expect(sidebar.collection('Billing copy')).toHaveCount(0);
    });
  });

  test('offers to open a picked workspace folder without collections', async ({ createTmpDir }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const workspacePath = writeWorkspace(path.join(await createTmpDir('empty-workspace-folder'), 'Team Workspace'), 'Team Workspace');

    await chooseFolders(page, app, [workspacePath]);

    await test.step('Verify the note says the folder is a workspace', async () => {
      await expect(openCollectionModal.note()).toContainText('Team Workspace is a Bruno workspace, not a collection.');
      await expect(openCollectionModal.noteActionButton()).toHaveText('Open workspace');
    });

    await test.step('Click Open workspace', async () => {
      await openCollectionModal.noteActionButton().click();
    });

    await test.step('Verify the workspace is open', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(buildTitleBarLocators(page).activeWorkspaceName()).toHaveText('Team Workspace');
    });
  });

  test('hands a workspace export zip on Import to the Import Workspace dialog', async ({ createTmpDir }) => {
    const importWorkspace = buildImportWorkspaceModalLocators(page);
    const zipPath = createWorkspaceZip(await createTmpDir('workspace-zip'), 'Zipped WS');
    const extractLocation = await createTmpDir('workspace-zip-location');

    await selectImportFiles(page, [zipPath]);

    await test.step('Verify the Import Workspace dialog opens with the zip selected', async () => {
      await expect(buildOpenCollectionModalLocators(page).root()).toBeHidden();
      await expect(importWorkspace.selectedFileName('Zipped WS.zip')).toBeVisible();
    });

    await test.step('Choose where to put the workspace and import it', async () => {
      await mockBrowseFiles(app, [extractLocation]);
      await importWorkspace.locationInput().click();
      await expect(importWorkspace.locationInput()).toHaveValue(extractLocation);
      await importWorkspace.importButton().click();
    });

    await test.step('Verify the workspace is imported and open', async () => {
      await expect(page.getByText('Workspace imported successfully!')).toBeVisible();
      await expect(buildTitleBarLocators(page).activeWorkspaceName()).toHaveText('Zipped WS');
    });
  });

  test('says a workspace.yml file on Import is not a collection', async ({ createTmpDir }) => {
    const { import: importLocators, toast } = buildCommonLocators(page);
    const workspacePath = writeWorkspace(path.join(await createTmpDir('workspace-file'), 'Petstore'), 'Petstore APIs');
    const errorToast = toast.byMessage('This is a Bruno workspace file, not a collection. Choose its folder to open the workspace.');

    await selectImportFiles(page, [path.join(workspacePath, 'workspace.yml')]);

    await test.step('Verify the error and that nothing is imported', async () => {
      await expect(errorToast).toBeVisible();
      await expect(buildOpenCollectionModalLocators(page).pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
