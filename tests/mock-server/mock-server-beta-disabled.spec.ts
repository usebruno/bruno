import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../playwright';
import { openWorkspaceFromDialog, switchWorkspace, waitForReadyPage } from '../utils/page';
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
const COLLECTION_SETTINGS_TAB = 'Collection';
const RUNNER_TAB = 'Runner';
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

type LaunchElectronApp = (options: { initUserDataPath: string; templateVars: Record<string, string> }) => Promise<ElectronApplication>;

const launchApp = (launchElectronApp: LaunchElectronApp, collectionFixturePath: string | null) => launchElectronApp({
  initUserDataPath: path.join(__dirname, 'init-user-data'),
  templateVars: { collectionPath: collectionFixturePath! }
});

const openFirstMockResponse = async (page: Page) => {
  const ms = buildMockServerLocators(page);
  const { tabs } = buildCommonLocators(page);
  await syncResponsesFromExamples(page, COLLECTION_NAME);
  const responseName = await ms.responseListNames().first().innerText();
  await ms.responseListOpenBtns().first().dblclick();
  await expect(tabs.requestTab(SERVER_NAME)).toBeVisible();
  await expect(tabs.requestTab(responseName)).toBeVisible();
  return responseName;
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
      let responseName = '';
      let port = '';

      await test.step('Create and start a mock server, then open one of its responses', async () => {
        await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
        port = await startMockServer(page);
        expect(await isPortServing(port)).toBe(true);
        responseName = await openFirstMockResponse(page);
      });

      await setMockServerBetaFeature(page, false);

      await test.step('The mock server and mock response tabs are closed', async () => {
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await expect(tabs.requestTab(responseName)).toHaveCount(0);
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
      let responseName = '';

      await test.step('Open the collection settings, a mock server dashboard and one of its responses', async () => {
        await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
        await ms.collectionRow(COLLECTION_NAME).dblclick();
        await expect(tabs.collectionSettingsTab()).toBeVisible();
        responseName = await openFirstMockResponse(page);
      });

      await test.step('Close the mock response tab by hand while the feature is still on', async () => {
        await closeTabByName(page, responseName);
      });

      await setMockServerBetaFeature(page, false);

      await test.step('Open and close the collection runner tab', async () => {
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await focusTabWithoutSidebarFocus(page, COLLECTION_SETTINGS_TAB);
        await collectionHeader.runner().click();
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible();
        await closeTabByName(page, RUNNER_TAB);
      });

      await test.step('Reopen Last Closed Tab restores the runner tab but never a mock tab', async () => {
        await focusTabWithoutSidebarFocus(page, COLLECTION_SETTINGS_TAB);
        await pressShortcut(page, modifier, 'Shift', 'KeyT');
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible();
        for (let attempt = 0; attempt < 2; attempt++) {
          await focusTabWithoutSidebarFocus(page, COLLECTION_SETTINGS_TAB);
          await pressShortcut(page, modifier, 'Shift', 'KeyT');
        }
        await expect(tabs.requestTab(SERVER_NAME)).toHaveCount(0);
        await expect(tabs.requestTab(responseName)).toHaveCount(0);
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
      let responseName = '';

      await test.step('Open the collection runner, a mock server dashboard and one of its responses', async () => {
        await createMockServerFromCollection(page, COLLECTION_NAME, SERVER_NAME);
        await ms.collectionRow(COLLECTION_NAME).dblclick();
        await collectionHeader.runner().click();
        await expect(tabs.requestTab(RUNNER_TAB)).toBeVisible();
        responseName = await openFirstMockResponse(page);
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
        await expect(tabs.requestTab(responseName)).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
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
      let originalName = '';

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
        originalName = await openFirstMockResponse(page);
        await editOpenResponseName(discardedName);
      });

      await setMockServerBetaFeature(page, false, { resolveUnsavedChanges: 'discard' });

      await test.step('Don\'t Save closes the tabs and keeps the saved name', async () => {
        await expect(tabs.requestTab(originalName)).toHaveCount(0);
        await reopenResponses();
        await expect(ms.responseOpenBtn(originalName)).toBeVisible();
        await expect(ms.responseOpenBtn(discardedName)).toHaveCount(0);
      });

      await test.step('Edit the name again without saving', async () => {
        await ms.responseOpenBtn(originalName).dblclick();
        await expect(tabs.requestTab(originalName)).toBeVisible();
        await editOpenResponseName(savedName);
      });

      await setMockServerBetaFeature(page, false, { resolveUnsavedChanges: 'save' });

      await test.step('Save writes the edit before the tabs close', async () => {
        await expect(tabs.requestTab(originalName)).toHaveCount(0);
        await reopenResponses();
        await expect(ms.responseOpenBtn(savedName)).toBeVisible();
        await expect(ms.responseOpenBtn(originalName)).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
