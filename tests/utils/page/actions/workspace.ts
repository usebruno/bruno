import AdmZip from 'adm-zip';
import { test, expect, Page, Locator, ElectronApplication, waitForReadyPage } from '../../../../playwright';
import * as path from 'path';

export const buildImportWorkspaceLocators = (page: Page) => {
  // Scope every modal query to the dialog so we avoid the brittle
  // `.bruno-modal-card` class selector. The title filter also disambiguates
  // this modal from any other open dialog.
  const modal = () => page.getByRole('dialog').filter({ hasText: 'Import Workspace' });

  return {
    // Title-bar workspace dropdown
    menuTrigger: () => page.getByTestId('workspace-menu'),
    activeWorkspaceName: () => page.getByTestId('workspace-name'),
    dropdownItem: () => page.getByTestId('workspace-menu-import-workspace'),

    // Import Workspace modal
    modal,
    // The file <input> is hidden with no testid/label/role, so an attribute
    // selector scoped to the modal is the only reliable handle for setInputFiles().
    fileInput: () => modal().locator('input[type="file"]'),
    selectedFileName: (name: string) => modal().getByText(name),
    removeFileButton: () => modal().getByText('Remove'),
    locationInput: () => page.getByLabel('Extract Location'),
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
 * Open the title-bar workspace dropdown and launch the Import Workspace modal.
 */
export const openImportWorkspaceModal = async (page: Page) => {
  const l = buildImportWorkspaceLocators(page);
  await test.step('Open workspace menu and click "Import workspace"', async () => {
    await l.menuTrigger().click();
    await l.dropdownItem().click();
    await expect(l.modal()).toBeVisible({ timeout: 2000 });
  });
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
 * Run the full import flow inside an already-open modal:
 * select the zip, ensure an extract location is set, and click Import.
 */
export const submitWorkspaceImport = async (page: Page, opts: ImportWorkspaceOptions) => {
  const l = buildImportWorkspaceLocators(page);

  await test.step('Select the workspace zip file', async () => {
    await l.fileInput().setInputFiles(opts.zipPath);
    await expect(l.selectedFileName(path.basename(opts.zipPath))).toBeVisible({ timeout: 2000 });
  });

  await test.step('Ensure an extract location is set', async () => {
    if (opts.extractLocation && opts.app) {
      // Stub the directory picker so Browse resolves to the desired location.
      await opts.app.evaluate(({ dialog }, target: string) => {
        (dialog as { showOpenDialog: typeof dialog.showOpenDialog }).showOpenDialog = () =>
          Promise.resolve({ canceled: false, filePaths: [target] });
      }, opts.extractLocation);
      await l.locationInput().click();
      await expect(l.locationInput()).toHaveValue(opts.extractLocation, { timeout: 2000 });
    } else {
      // Rely on the pre-filled default location.
      await expect(l.locationInput()).not.toHaveValue('');
    }
  });

  await test.step('Submit the import', async () => {
    await l.importButton().click();
  });
};

/**
 * Convenience: open the modal and import a zip in one call.
 */
export const importWorkspaceFromZip = async (page: Page, opts: ImportWorkspaceOptions) => {
  await openImportWorkspaceModal(page);
  await submitWorkspaceImport(page, opts);
};
