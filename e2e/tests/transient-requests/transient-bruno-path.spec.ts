import * as fs from 'fs';
import * as path from 'path';
import { test, expect, closeElectronApp, waitForReadyPage, ElectronApplication, Page } from '../../playwright';
import { closeAllCollections, closeAllTabs, createCollection, createTransientRequestFromPreset, createWorkspace, restoreOpenDialog, stashOpenDialog } from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

const collectionNotFound = /Collection not found for the given pathname/;
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Transient request when the user folder starts with bruno-', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = path.join(await createTmpDir('bruno-abc-userdata'), 'bruno-abc', 'AppData', 'Bruno');

    app = await launchElectronApp({ userDataPath });
    page = await waitForReadyPage(app);
    await stashOpenDialog(app);

    const actualUserDataPath = await app.evaluate(({ app: electronApp }) => electronApp.getPath('userData'));
    expect(path.normalize(actualUserDataPath).split(path.sep)).toContain('bruno-abc');
  });

  test.afterEach(async () => {
    await closeAllTabs(page);
    await closeAllCollections(page);
  });

  test.afterAll(async () => {
    await restoreOpenDialog(app);
    await closeElectronApp(app);
  });

  test('TC-8686: Creates a transient request from the collection level', { tag: '@sanity' }, async ({ createTmpDir }) => {
    const collectionName = 'transient-bruno-abc';
    const { tabs, toast } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
    });

    await test.step('Create a transient request by clicking the + icon', async () => {
      await createTransientRequestFromPreset(page);
    });

    await test.step('Verify that a new request page is opened', async () => {
      await expect(toast.byMessage(collectionNotFound)).toHaveCount(0);
      await expect(tabs.activeRequestTab()).toContainText('Untitled');
    });
  });

  test('TC-3113: Creates a transient request from the workspace level', { tag: '@sanity' }, async () => {
    const { tabs, titleBar, toast } = buildCommonLocators(page);

    await test.step('Go to the workspace overview', async () => {
      await titleBar.homeButton().click();
    });

    await test.step('Create a transient request by clicking the + icon', async () => {
      await createTransientRequestFromPreset(page);
    });

    await test.step('Verify that a new request page is opened', async () => {
      await expect(toast.byMessage(collectionNotFound)).toHaveCount(0);
      await expect(tabs.activeRequestTab()).toContainText('Untitled');
    });
  });

  test('TC-1511: Verify saving the request in a workspace having no collection to begin with', { tag: '@sanity' }, async ({ createTmpDir }) => {
    const collectionName = 'first-collection';
    const requestName = 'saved-request';
    const collectionLocation = await createTmpDir(collectionName);
    const { sidebar, tabs, toast } = buildCommonLocators(page);
    const saveModal = sidebar.saveRequestModal;

    await test.step('Create a new workspace and keep it empty', async () => {
      await createWorkspace(page, 'empty-workspace');
    });

    await test.step('Create a transient request from the + icon', async () => {
      await createTransientRequestFromPreset(page);
    });

    await test.step('Save the request and verify the popup', async () => {
      await page.keyboard.press(saveShortcut);
      await expect(saveModal.root()).toBeVisible();
      await expect(saveModal.emptyState()).toBeVisible();
    });

    await test.step('Create a collection from inside the popup', async () => {
      await saveModal.newCollectionButton().click();
      await saveModal.collectionNameInput().fill(collectionName);
      await app.evaluate(({ dialog }, dir) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
      }, collectionLocation);
      await saveModal.browseButton().click();
      await expect(saveModal.locationInput()).toHaveValue(collectionLocation);
      await saveModal.createCollectionButton().click();
      await expect(toast.byMessage('Collection created!')).toBeVisible();
    });

    await test.step('Choose the new collection, name the request and save', async () => {
      await saveModal.collectionOption(collectionName).click();
      await saveModal.requestNameInput().fill(requestName);
      await saveModal.saveButton().click();
      await expect(toast.byMessage('Request saved successfully')).toBeVisible();
    });

    await test.step('Verify that the request is saved as configured', async () => {
      await expect(saveModal.root()).toBeHidden();
      await sidebar.collection(collectionName).click();
      await sidebar.request(requestName).click();
      await expect(tabs.activeRequestTabLabel()).toContainText(requestName);
      await expect.poll(() => fs.existsSync(path.join(collectionLocation, collectionName, `${requestName}.yml`))).toBe(true);
    });
  });
});
