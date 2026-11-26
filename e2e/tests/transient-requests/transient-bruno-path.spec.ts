import * as fs from 'fs';
import * as path from 'path';
import { test as base, expect, closeElectronApp, waitForReadyPage, ElectronApplication, Page } from '../../playwright';
import {
  buildCommonLocators,
  createCollectionInSaveModal,
  createTransientRequestFromPreset,
  saveTransientViaModal,
  openCollectionFromDialog
} from '../../pages';

type BrunoAbcApp = { app: ElectronApplication; page: Page };

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

const test = base.extend<{ brunoAbcApp: BrunoAbcApp }>({
  brunoAbcApp: async ({ launchElectronApp, createTmpDir }, use) => {
    let app: ElectronApplication | undefined;
    try {
      const userDataPath = path.join(await createTmpDir('bruno-abc-userdata'), 'bruno-abc', 'AppData', 'Bruno');
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      const actualUserDataPath = await app.evaluate(({ app: electronApp }) => electronApp.getPath('userData'));
      expect(path.normalize(actualUserDataPath).split(path.sep)).toContain('bruno-abc');

      await use({ app, page });
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  }
});

test.describe('Creating a transient request when the user data path contains "bruno"', () => {
  test('TC-8686: Creates a transient request from the collection level', { tag: '@sanity' }, async ({
    brunoAbcApp: { app, page },
    collectionFixturePath
  }) => {
    const { tabs } = buildCommonLocators(page);

    await openCollectionFromDialog(page, app, collectionFixturePath!);

    await createTransientRequestFromPreset(page);

    await test.step('Verify that a new request page is opened', async () => {
      await expect(tabs.activeRequestTab()).toContainText('Untitled');
    });
  });

  test('TC-3113: Creates a transient request from the workspace level', { tag: '@sanity' }, async ({
    brunoAbcApp: { app, page },
    collectionFixturePath
  }) => {
    const { tabs, titleBar } = buildCommonLocators(page);

    await test.step('Go to workspace overview', async () => {
      await openCollectionFromDialog(page, app, collectionFixturePath!);
      await titleBar.homeButton().click();
    });

    await createTransientRequestFromPreset(page);

    await test.step('Verify that a new request page is opened', async () => {
      await expect(tabs.activeRequestTab()).toContainText('Untitled');
    });
  });

  test('TC-1511: Verify saving the transient request in a workspace having no collection to begin with', { tag: '@sanity' }, async ({
    brunoAbcApp: { app, page },
    createTmpDir
  }) => {
    const collectionName = 'first-collection-bruno';
    const requestName = 'saved-request-bruno';
    const collectionLocation = await createTmpDir(collectionName);
    const { sidebar, tabs } = buildCommonLocators(page);
    const createCollectionInTransientSaveModal = sidebar.saveRequestModal;

    await createTransientRequestFromPreset(page);

    await test.step('Save the request and verify the popup', async () => {
      await page.keyboard.press(saveShortcut);
      await expect(createCollectionInTransientSaveModal.emptyState()).toBeVisible();
    });

    await createCollectionInSaveModal(page, app, collectionName, collectionLocation);

    await saveTransientViaModal(page, requestName, { collectionName });

    await test.step('Verify that the request is saved as configured', async () => {
      await expect(createCollectionInTransientSaveModal.root()).toBeHidden();
      await expect(tabs.activeRequestTabLabel()).toContainText(requestName);
      await expect.poll(() => fs.existsSync(path.join(collectionLocation, collectionName, `${requestName}.yml`))).toBe(true);
    });
  });
});
