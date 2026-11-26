import * as fs from 'fs';
import * as path from 'path';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../../playwright';
import { restoreDocumentsPath, stubDocumentsPath, waitForReadyPage } from '../../../utils';
import { buildWelcomeModalLocators, goToWelcomeModalActions } from '../../../pages/app-shell/welcome-modal';
import { buildOpenCollectionModalLocators } from '../../../pages/open-collection-modal/shell';

const initUserDataPath = path.join(__dirname, 'init-user-data-fresh');

const readHasSeenWelcomeModal = async (userDataPath: string) => {
  try {
    const { preferences } = JSON.parse(await fs.promises.readFile(path.join(userDataPath, 'preferences.json'), 'utf8'));
    return preferences.onboarding.hasSeenWelcomeModal;
  } catch {
    return undefined;
  }
};

test.describe('Welcome modal hand-off to the Open collection modal', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let userDataPath: string;

  test.beforeEach(async ({ launchElectronApp, createTmpDir, collectionFixturePath }) => {
    userDataPath = await createTmpDir('welcome-modal-userdata');
    electronApp = await launchElectronApp({
      userDataPath,
      initUserDataPath,
      templateVars: { collectionPath: collectionFixturePath! }
    });
    page = await waitForReadyPage(electronApp);
  });

  test.afterEach(async () => {
    await restoreDocumentsPath(electronApp);
    await closeElectronApp(electronApp);
  });

  test('opens the Import page from the Import Collection card', async () => {
    const welcomeModal = buildWelcomeModalLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await goToWelcomeModalActions(page);

    await test.step('Click the Import Collection card', async () => {
      await welcomeModal.importCollectionCard().click();
    });

    await test.step('Verify the welcome modal closes and the Open collection modal shows Import', async () => {
      await expect(welcomeModal.root()).toBeHidden();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
    });
  });

  test('opens My computer from Open existing collection', async ({ createTmpDir }) => {
    const welcomeModal = buildWelcomeModalLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Point the documents folder at an empty temporary folder', async () => {
      await stubDocumentsPath(electronApp, await createTmpDir('welcome-modal-documents'));
    });

    await goToWelcomeModalActions(page);

    await test.step('Click Open existing collection', async () => {
      await welcomeModal.openExistingCollectionButton().click();
    });

    await test.step('Verify the welcome modal closes and the Open collection modal shows My computer', async () => {
      await expect(welcomeModal.root()).toBeHidden();
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
    });
  });

  test('remembers that the welcome modal was seen once an action is chosen', async () => {
    const welcomeModal = buildWelcomeModalLocators(page);

    await goToWelcomeModalActions(page);

    await test.step('Verify the preferences still mark the welcome modal as unseen', async () => {
      await expect.poll(() => readHasSeenWelcomeModal(userDataPath)).toBe(false);
    });

    await test.step('Click the Import Collection card', async () => {
      await welcomeModal.importCollectionCard().click();
    });

    await test.step('Verify the preferences mark the welcome modal as seen', async () => {
      await expect.poll(() => readHasSeenWelcomeModal(userDataPath)).toBe(true);
    });
  });
});
