import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../playwright';
import {
  findSnapshotCollectionEntry,
  openWorkspaceFromDialog,
  readSnapshot,
  switchWorkspace,
  waitForReadyPage
} from '../utils/page';
import { buildTitleBarLocators } from '../utils/page/title-bar';
import { buildCommonLocators } from '../utils/page/locators';
import {
  buildMockServerLocators,
  createMockServerFromCollection,
  syncResponsesFromExamples,
  startMockServer,
  setMockServerBetaFeature,
  openMockServerTab
} from '../utils/page/mock-server';
import { closeTabByName, focusTabWithoutSidebarFocus, modifier, pressShortcut } from '../shortcuts/helpers';

const COLLECTION_NAME = 'mock-server-test-collection';
const SERVER_NAME = 'Beta Toggle Mock';
const RESPONSE_NAME = 'created-201 (mock)';
const COLLECTION_SETTINGS_TAB = 'Collection';
const RUNNER_TAB = 'Runner';
const PREFERENCES_TAB = 'Preferences';
const OTHER_WORKSPACE_NAME = 'OtherWorkspace';
const OTHER_WORKSPACE_YML = [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${OTHER_WORKSPACE_NAME}`,
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

const isPortServing = async (port: string) => {
  try {
    await fetch(`http://127.0.0.1:${port}/health`);
    return true;
  } catch {
    return false;
  }
};

type LaunchElectronApp = (options: {
  initUserDataPath?: string;
  userDataPath?: string;
  templateVars?: Record<string, string>;
}) => Promise<ElectronApplication>;

const launchApp = (launchElectronApp: LaunchElectronApp, collectionFixturePath: string | null, userDataPath?: string) => launchElectronApp({
  initUserDataPath: path.join(__dirname, 'init-user-data'),
  userDataPath,
  templateVars: { collectionPath: collectionFixturePath! }
});

const turnOffMockServerInPreferencesFile = (userDataPath: string) => {
  const preferencesPath = path.join(userDataPath, 'preferences.json');
  const saved = JSON.parse(fs.readFileSync(preferencesPath, 'utf-8'));
  saved.preferences.beta['mock-server'] = false;
  fs.writeFileSync(preferencesPath, JSON.stringify(saved, null, 2));
};

const openMockResponse = async (page: Page) => {
  const ms = buildMockServerLocators(page);
  const { tabs } = buildCommonLocators(page);
  await syncResponsesFromExamples(page, COLLECTION_NAME);
  await ms.responseOpenBtn(RESPONSE_NAME).dblclick();
  await expect(tabs.requestTab(SERVER_NAME)).toBeVisible();
  await expect(tabs.requestTab(RESPONSE_NAME)).toBeVisible();
};

test.describe('Turning off the Mock Server beta feature', () => {
  test.describe.configure({ timeout: 90_000 });

  test('closes open mock tabs and stops running servers, and the feature works again once re-enabled', async ({
    launchElectronApp,
    collectionFixturePath
  }) => {
    const app = await launchApp(launchElectronApp, collectionFixturePath);

    try {
      const page = await waitForReadyPage(app);
      const ms = buildMockServerLocators(page);
      const { tabs } = buildCommonLocators(page);
      let port = '';

      await test.step('Create and start a mock server, then open one of its responses', async () => {
        await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
        port = await startMockServer(page);
        expect(await isPortServing(port)).toBe(true);
        await openMockResponse(page);
      });

      await setMockServerBetaFeature(page, false);

      await test.step('The mock server and mock response tabs are closed', async () => {
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await expect(tabs.requestTab(RESPONSE_NAME)).toHaveCount(0);
        await expect(ms.sidebarSection()).toHaveCount(0);
      });

      await test.step('The running mock server was stopped', async () => {
        await expect.poll(() => isPortServing(port), { timeout: 15000 }).toBe(false);
      });

      await setMockServerBetaFeature(page, true);

      await test.step('The mock server can be opened again and shows as stopped', async () => {
        await expect(ms.sidebarSection()).toBeVisible();
        await openMockServerTab(page, COLLECTION_NAME);
        await expect(ms.statusText()).toHaveText('Stopped');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('Reopen Last Closed Tab does not bring back any mock tab once the feature is off', async ({
    launchElectronApp,
    collectionFixturePath
  }) => {
    const app = await launchApp(launchElectronApp, collectionFixturePath);

    try {
      const page = await waitForReadyPage(app);
      const ms = buildMockServerLocators(page);
      const { tabs, collectionHeader } = buildCommonLocators(page);

      await test.step('Open and close the collection runner tab before any mock tab', async () => {
        await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
        await ms.collectionRow(COLLECTION_NAME).dblclick();
        await expect(tabs.collectionSettingsTab()).toBeVisible();
        await collectionHeader.runner().click();
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible();
        await closeTabByName(page, RUNNER_TAB);
      });

      await test.step('Open a mock response and close it by hand while the feature is still on', async () => {
        await openMockResponse(page);
        await closeTabByName(page, RESPONSE_NAME);
      });

      await setMockServerBetaFeature(page, false);

      await test.step('Reopen Last Closed Tab skips every mock tab closed after the runner', async () => {
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await focusTabWithoutSidebarFocus(page, COLLECTION_SETTINGS_TAB);
        await pressShortcut(page, modifier, 'Shift', 'KeyT');
        await expect(tabs.requestTab(PREFERENCES_TAB)).toBeVisible();
        await focusTabWithoutSidebarFocus(page, COLLECTION_SETTINGS_TAB);
        await pressShortcut(page, modifier, 'Shift', 'KeyT');
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible();
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await expect(tabs.requestTab(RESPONSE_NAME)).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('mock tabs saved in another workspace are not restored after the feature is turned off', async ({
    launchElectronApp,
    collectionFixturePath,
    createTmpDir
  }) => {
    const otherWorkspacePath = await createTmpDir('other-workspace');
    fs.writeFileSync(path.join(otherWorkspacePath, 'workspace.yml'), OTHER_WORKSPACE_YML);
    const app = await launchApp(launchElectronApp, collectionFixturePath);

    try {
      const page = await waitForReadyPage(app);
      const ms = buildMockServerLocators(page);
      const { tabs, collectionHeader } = buildCommonLocators(page);
      const titleBar = buildTitleBarLocators(page);
      const startingWorkspaceName = await titleBar.activeWorkspaceName().innerText();

      await test.step('Open the collection runner, a mock server dashboard and one of its responses', async () => {
        await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
        await ms.collectionRow(COLLECTION_NAME).dblclick();
        await collectionHeader.runner().click();
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible();
        await openMockResponse(page);
      });

      await test.step('Switch to another workspace and turn the feature off there', async () => {
        await openWorkspaceFromDialog(app, page, otherWorkspacePath);
        await expect(titleBar.activeWorkspaceName()).toHaveText(OTHER_WORKSPACE_NAME, { timeout: 10000 });
        await setMockServerBetaFeature(page, false);
      });

      await test.step('Switching back restores the saved tabs without the mock tabs', async () => {
        await switchWorkspace(page, startingWorkspaceName);
        await ms.collectionName(COLLECTION_NAME).click();
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible({ timeout: 10000 });
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await expect(tabs.requestTab(RESPONSE_NAME)).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('a mock response saved as the active tab is not restored on launch once the feature is off', async ({
    launchElectronApp,
    collectionFixturePath,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('mock-server-beta-disabled-restart');
    const collectionPath = path.join(collectionFixturePath!, COLLECTION_NAME);
    const app = await launchApp(launchElectronApp, collectionFixturePath, userDataPath);

    await test.step('Open the collection runner, then a mock response as the active tab', async () => {
      const page = await waitForReadyPage(app);
      const ms = buildMockServerLocators(page);
      const { tabs, collectionHeader } = buildCommonLocators(page);
      await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
      await ms.collectionRow(COLLECTION_NAME).dblclick();
      await collectionHeader.runner().click();
      await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible();
      await openMockResponse(page);
    });

    await test.step('The snapshot saves the mock response as the active tab', async () => {
      await expect.poll(() => (
        findSnapshotCollectionEntry(readSnapshot(userDataPath), collectionPath)?.activeTab?.accessor
      ), { timeout: 15000 }).toBe('type::mockResponseUid');
      await closeElectronApp(app);
    });

    await test.step('Turn the feature off while the app is closed', async () => {
      turnOffMockServerInPreferencesFile(userDataPath);
    });

    const relaunchedApp = await launchElectronApp({ userDataPath });

    try {
      await test.step('Relaunching restores the runner tab without any mock tab', async () => {
        const page = await waitForReadyPage(relaunchedApp);
        const ms = buildMockServerLocators(page);
        const { tabs } = buildCommonLocators(page);
        await ms.collectionName(COLLECTION_NAME).click();
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible({ timeout: 10000 });
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await expect(tabs.requestTab(RESPONSE_NAME)).toHaveCount(0);
        await expect(ms.sidebarSection()).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(relaunchedApp);
    }
  });

  test('asks whether to save unsaved mock response edits before turning the feature off', async ({
    launchElectronApp,
    collectionFixturePath
  }) => {
    const discardedName = 'discarded-mock-response-name';
    const savedName = 'saved-mock-response-name';
    const app = await launchApp(launchElectronApp, collectionFixturePath);

    try {
      const page = await waitForReadyPage(app);
      const ms = buildMockServerLocators(page);
      const { tabs } = buildCommonLocators(page);

      const editOpenResponseName = async (name: string) => {
        await ms.responseEditBtn().click();
        await ms.responseNameInput().fill(name);
      };

      const reopenResponses = async () => {
        await setMockServerBetaFeature(page, true);
        await openMockServerTab(page, COLLECTION_NAME);
        await ms.tabResponses().click();
      };

      await test.step('Open a mock response and edit its name without saving', async () => {
        await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
        await openMockResponse(page);
        await editOpenResponseName(discardedName);
      });

      await setMockServerBetaFeature(page, false, { resolveUnsavedChanges: 'discard' });

      await test.step('Don\'t Save closes the tabs and keeps the saved name', async () => {
        await expect(tabs.requestTab(RESPONSE_NAME)).toHaveCount(0);
        await reopenResponses();
        await expect(ms.responseOpenBtn(RESPONSE_NAME)).toBeVisible();
        await expect(ms.responseOpenBtn(discardedName)).toHaveCount(0);
      });

      await test.step('Edit the name again without saving', async () => {
        await ms.responseOpenBtn(RESPONSE_NAME).dblclick();
        await expect(tabs.requestTab(RESPONSE_NAME)).toBeVisible();
        await editOpenResponseName(savedName);
      });

      await setMockServerBetaFeature(page, false, { resolveUnsavedChanges: 'save' });

      await test.step('Save writes the edit before the tabs close', async () => {
        await expect(tabs.requestTab(RESPONSE_NAME)).toHaveCount(0);
        await reopenResponses();
        await expect(ms.responseOpenBtn(savedName)).toBeVisible();
        await expect(ms.responseOpenBtn(RESPONSE_NAME)).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
