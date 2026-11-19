import * as fs from 'fs';
import * as path from 'path';
import { test as base, expect, closeElectronApp, waitForReadyPage, ElectronApplication, Page } from '../../playwright';
import { createCollection, createCollectionInSaveModal, createTransientRequestFromPreset, createWorkspace } from '../utils/page/actions';
import { saveTransientViaModal } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

type BrunoAbcApp = { app: ElectronApplication; page: Page };

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

// One app per test, so parallel tests never share a window. The fixture closes it after the test.
const test = base.extend<{ brunoAbcApp: BrunoAbcApp }>({
  brunoAbcApp: async ({ launchElectronApp, createTmpDir }, use) => {
    const userDataPath = path.join(await createTmpDir('bruno-abc-userdata'), 'bruno-abc', 'AppData', 'Bruno');
    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    const actualUserDataPath = await app.evaluate(({ app: electronApp }) => electronApp.getPath('userData'));
    expect(path.normalize(actualUserDataPath).split(path.sep)).toContain('bruno-abc');

    await use({ app, page });
    await closeElectronApp(app);
  }
});

test.describe('Creating and saving transient requests when the username starts with bruno-', () => {
  test('TC-8686: Creates a transient request from the collection level', { tag: '@sanity' }, async ({ brunoAbcApp: { page }, createTmpDir }) => {
    const collectionName = 'transient-bruno-abc';
    const { tabs } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
    });

    await test.step('Create a transient request by clicking the + icon', async () => {
      await createTransientRequestFromPreset(page);
    });

    await test.step('Verify that a new request page is opened', async () => {
      await expect(tabs.activeRequestTab()).toContainText('Untitled');
    });
  });

  test('TC-3113: Creates a transient request from the workspace level', { tag: '@sanity' }, async ({ brunoAbcApp: { page }, createTmpDir }) => {
    const collectionName = 'workspace-level-collection';
    const { tabs, titleBar, workspaceOverview } = buildCommonLocators(page);

    await test.step('Create a workspace', async () => {
      await createWorkspace(page, 'transient-workspace');
    });

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
    });

    await test.step('Go to the workspace overview', async () => {
      await titleBar.homeButton().click();
      await expect(workspaceOverview.collectionCard(collectionName)).toBeVisible();
    });

    await test.step('Create a transient request by clicking the + icon', async () => {
      await createTransientRequestFromPreset(page);
    });

    await test.step('Verify that a new request page is opened', async () => {
      await expect(tabs.activeRequestTab()).toContainText('Untitled');
    });
  });

  test('TC-1511: Verify saving the request in a workspace having no collection to begin with', { tag: '@sanity' }, async ({ brunoAbcApp: { app, page }, createTmpDir }) => {
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
      await expect(saveModal.emptyState()).toBeVisible();
    });

    await test.step('Create a collection from inside the popup', async () => {
      await createCollectionInSaveModal(page, app, collectionName, collectionLocation);
    });

    await test.step('Choose the new collection, name the request and save', async () => {
      await saveTransientViaModal(page, requestName, { collectionName });
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
