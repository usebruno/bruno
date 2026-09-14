import AdmZip from 'adm-zip';
import * as path from 'path';
import { clickImportWorkspace } from '../title-bar';
import { test, expect, Page, Locator, ElectronApplication, waitForReadyPage } from '../../../../playwright';

/**
 * Import Workspace modal locators.
 */
export const buildImportWorkspaceModalLocators = (page: Page) => {
  // Scope every modal query to the dialog so we avoid the brittle
  const modal = () => page.getByRole('dialog').filter({ hasText: 'Import Workspace' });

  return {
    // Import Workspace modal
    modal,
    fileInput: () => modal().getByTestId('import-workspace-file-input'),
    selectedFileName: (name: string) => modal().getByText(name),
    removeFileButton: () => modal().getByText('Remove'),
    locationInput: () => modal().getByLabel('Extract Location'),
    browseLink: () => modal().getByText('Browse', { exact: true }),
    importButton: () => modal().getByTestId('modal-submit-btn')
  };
};

/**
 * Build a valid Bruno workspace zip on disk that the importer will accept.
 * The zip contains a single `workspace.yml` (info.name + info.type: workspace).
 *
 * @param zipDir - directory in which to write the zip
 * @param workspaceName - the workspace name embedded in workspace.yml
 * @returns absolute path to the created zip file
 */
export const createWorkspaceZip = (zipDir: string, workspaceName: string): string => {
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

  const zip = new AdmZip();
  zip.addFile('workspace.yml', Buffer.from(workspaceYml, 'utf8'));

  const zipPath = path.join(zipDir, `${workspaceName}.zip`);
  zip.writeZip(zipPath);
  return zipPath;
};

/**
 * Open the workspace dropdown and launch the Import Workspace modal.
 */
export const openImportWorkspaceModal = async (page: Page) => {
  const locators = buildImportWorkspaceModalLocators(page);
  await clickImportWorkspace(page);
  await locators.modal().waitFor({ state: 'visible' });
};

type ImportWorkspaceOptions = {
  zipPath: string;
  /**
   * Where to extract the workspace. When omitted, the modal's pre-filled
   * default location (from preferences.general.defaultLocation) is used as-is.
   */
  extractLocation?: string;
  app?: ElectronApplication;
};

/**
 * select the zip, ensure an extract location is set, and click Import.
 */
export const submitWorkspaceImport = async (page: Page, opts: ImportWorkspaceOptions) => {
  const locators = buildImportWorkspaceModalLocators(page);

  await test.step('Select the workspace zip file', async () => {
    await locators.fileInput().setInputFiles(opts.zipPath);
    await expect(locators.selectedFileName(path.basename(opts.zipPath))).toBeVisible();
  });

  await test.step('Ensure an extract location is set', async () => {
    if (opts.extractLocation && opts.app) {
      // Stub the directory picker so Browse resolves to the desired location.
      await opts.app.evaluate(({ dialog }, target: string) => {
        (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
          Promise.resolve({ canceled: false, filePaths: [target] });
      }, opts.extractLocation);
      await locators.locationInput().click();
      await expect(locators.locationInput()).toHaveValue(opts.extractLocation);
    } else {
      // Rely on the pre-filled default location.
      await expect(locators.locationInput()).not.toHaveValue('');
    }
  });

  await test.step('Submit the import', async () => {
    await locators.importButton().click();
  });
};

/**
 * open the modal and import a zip in one call.
 */
export const importWorkspaceFromZip = async (page: Page, opts: ImportWorkspaceOptions) => {
  await openImportWorkspaceModal(page);
  await submitWorkspaceImport(page, opts);
};
