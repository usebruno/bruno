import path from 'path';
import fs from 'fs';
import { test, expect, Page, ElectronApplication, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  openWorkspaceFromDialog,
  waitForReadyPage
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const workspaceYml = (name: string) =>
  ['opencollection: 1.0.0', 'info:', `  name: ${name}`, '  type: workspace', 'collections:', 'specs: []', 'docs: \'\'', ''].join(
    '\n'
  );

// Open a collection's context menu in the sidebar.
const openCollectionMenu = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).hover();
  const collectionAction = locators.actions.collectionActions(collectionName);
  await expect(collectionAction).toBeVisible({ timeout: 2000 });
  await collectionAction.click();
};

test.describe('Move collection into workspace', () => {
  test('moves an external collection into workspace/collections directory and reopens it there', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('move-ws-userdata');
    const workspacePath = await createTmpDir('move-ws-workspace');
    const externalLocation = await createTmpDir('move-ws-external');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), workspaceYml('MoveWS'));

    const collectionName = 'ExternalCol';
    const sourcePath = path.join(externalLocation, collectionName);
    const destinationPath = path.join(workspacePath, 'collections', collectionName);

    let app: ElectronApplication | undefined;
    try {
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      await test.step('Open MoveWS workspace', async () => {
        await openWorkspaceFromDialog(app, page, workspacePath);
        await expect(page.getByTestId('workspace-name')).toHaveText('MoveWS', { timeout: 10000 });
      });

      await test.step('Create an external collection with a request', async () => {
        await createCollection(page, collectionName, externalLocation);
        await createRequest(page, 'ping', collectionName, { url: 'https://echo.usebruno.com', method: 'GET' });
        expect(fs.existsSync(sourcePath)).toBe(true);
        expect(fs.existsSync(destinationPath)).toBe(false);
      });

      await test.step('Move the collection into the workspace', async () => {
        await openCollectionMenu(page, collectionName);
        await page.getByTestId('collection-actions-move-to-workspace').click();

        const moveModal = locators.modal.byTitle('Move into Workspace');
        await expect(moveModal).toBeVisible({ timeout: 5000 });
        await locators.modal.button('Move').click();

        await expect(page.getByText('Collection moved into workspace')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Files moved on disk and collection reopened from the new path', async () => {
        // Source directory is gone, destination exists with the request preserved
        expect(fs.existsSync(sourcePath)).toBe(false);
        expect(fs.existsSync(destinationPath)).toBe(true);
        expect(fs.readdirSync(destinationPath).some((entry) => entry.startsWith('ping'))).toBe(true);

        // Collection is still listed in the sidebar
        await expect(locators.sidebar.collection(collectionName)).toBeVisible({ timeout: 10000 });

        // workspace.yml now references the collection at its new location
        const workspaceConfig = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf-8');
        expect(workspaceConfig).toContain(collectionName);
      });
    } finally {
      if (app) await closeElectronApp(app);
    }
  });

  test('action is hidden for collections already inside the workspace', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('move-ws-internal-userdata');
    const workspacePath = await createTmpDir('move-ws-internal-workspace');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), workspaceYml('InternalWS'));

    // The internal collection must live under the workspace root, so ensure the
    // collections directory exists so the Create Collection modal accepts the location.
    const internalCollectionsDir = path.join(workspacePath, 'collections');
    fs.mkdirSync(internalCollectionsDir, { recursive: true });

    const internalName = 'InternalCol';

    let app: ElectronApplication | undefined;
    try {
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      await openWorkspaceFromDialog(app, page, workspacePath);
      await expect(page.getByTestId('workspace-name')).toHaveText('InternalWS', { timeout: 10000 });

      await createCollection(page, internalName, path.join(workspacePath, 'collections'));
      await openCollectionMenu(page, internalName);

      // The remove action confirms the menu is open
      await expect(page.getByTestId('collection-actions-remove')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('collection-actions-move-to-workspace')).toHaveCount(0);
    } finally {
      if (app) await closeElectronApp(app);
    }
  });

  test('prompts to save or discard drafts before moving', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('move-ws-drafts-userdata');
    const workspacePath = await createTmpDir('move-ws-drafts-workspace');
    const externalLocation = await createTmpDir('move-ws-drafts-external');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), workspaceYml('DraftsWS'));

    const collectionName = 'DraftCol';
    const sourcePath = path.join(externalLocation, collectionName);
    const destinationPath = path.join(workspacePath, 'collections', collectionName);

    let app: ElectronApplication | undefined;
    try {
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      await openWorkspaceFromDialog(app, page, workspacePath);
      await expect(page.getByTestId('workspace-name')).toHaveText('DraftsWS', { timeout: 10000 });

      await createCollection(page, collectionName, externalLocation);

      await test.step('Create a saved request, then dirty it to produce an unsaved draft', async () => {
        await createRequest(page, 'ping', collectionName, { url: 'https://echo.usebruno.com', method: 'GET' });
        await openRequest(page, collectionName, 'ping');
        await locators.request.urlInput().click();
        await page.locator('#request-url textarea').fill('https://echo.usebruno.com/changed');
        await expect(locators.tabs.draftIndicator()).toBeVisible({ timeout: 5000 });
      });

      await test.step('Move shows the drafts confirmation, then discard and move', async () => {
        await openCollectionMenu(page, collectionName);
        await page.getByTestId('collection-actions-move-to-workspace').click();

        // Drafts confirmation modal appears instead of the plain move modal
        await expect(page.getByText('You have unsaved changes')).toBeVisible({ timeout: 5000 });
        await page.getByTestId('move-workspace-discard-all').click();

        await expect(page.getByText('Collection moved into workspace')).toBeVisible({ timeout: 10000 });
      });

      expect(fs.existsSync(sourcePath)).toBe(false);
      expect(fs.existsSync(destinationPath)).toBe(true);

      // The discarded draft change must not have been saved
      const requestFiles = fs.readdirSync(destinationPath).filter((entry) => entry.startsWith('ping'));
      expect(requestFiles.length).toBeGreaterThan(0);
      const movedRequestContent = fs.readFileSync(path.join(destinationPath, requestFiles[0]), 'utf-8');
      expect(movedRequestContent).toContain('https://echo.usebruno.com');
      expect(movedRequestContent).not.toContain('https://echo.usebruno.com/changed');

      await expect(locators.sidebar.collection(collectionName)).toBeVisible({ timeout: 10000 });
    } finally {
      if (app) await closeElectronApp(app);
    }
  });
});
