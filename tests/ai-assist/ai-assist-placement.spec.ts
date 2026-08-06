import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  openCollectionSettings,
  openFolderSettings,
  selectCollectionPaneTab,
  selectCollectionScriptPaneTab,
  selectFolderScriptPaneTab,
  selectfolderPaneTab,
  selectRequestPaneTab,
  selectScriptSubTab,
  setAppEnabled
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('AI Assist tab-bar placement', () => {
  test.afterEach(async ({ pageWithUserData }) => {
    await closeAllCollections(pageWithUserData);
  });

  test('request pane: AI Assist sits in the tab bar, docs only in edit mode', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-assist-request';
    const requestName = 'request-1';

    await test.step('Arrange: create and open a request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: 'https://echo.usebruno.com' });
      await locators.sidebar.request(requestName).click();
      await locators.tabs.requestTab(requestName).waitFor({ state: 'visible' });
    });

    await test.step('Tests tab shows the AI Assist button', async () => {
      await selectRequestPaneTab(page, 'Tests');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('tests')).toBeVisible();
    });

    await test.step('Each Script sub-tab shows its own AI Assist button', async () => {
      await selectScriptSubTab(page, 'pre-request');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('pre-request')).toBeVisible();
      await selectScriptSubTab(page, 'post-response');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('post-response')).toBeVisible();
    });

    await test.step('Docs shows the AI Assist button only in edit mode', async () => {
      await selectRequestPaneTab(page, 'Docs');
      await expect(locators.aiAssist.trigger('docs')).toHaveCount(0);

      await locators.docs.editToggle().click();
      await expect(locators.aiAssist.requestPaneTabBarTrigger('docs')).toBeVisible();
    });
  });

  test('request pane: Script tab bar follows the default sub-tab when none was picked', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-assist-script-default';
    const requestName = 'request-1';

    await test.step('Arrange: create and open a request with no scripts', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName);
      await locators.sidebar.request(requestName).click();
      await locators.tabs.requestTab(requestName).waitFor({ state: 'visible' });
    });

    await test.step('Script defaults to post-response and the tab bar button matches', async () => {
      await selectRequestPaneTab(page, 'Script');
      await expect(locators.paneTabs.tabTrigger('post-response')).toContainClass('active');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('post-response')).toBeVisible();
      await expect(locators.aiAssist.trigger('pre-request')).toHaveCount(0);
    });
  });

  test('request pane: App tab shows the AI Assist button', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-assist-app-tab';
    const requestName = 'request-1';

    await test.step('Arrange: create a request and enable its app', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName);
      await locators.sidebar.request(requestName).click();
      await locators.tabs.requestTab(requestName).waitFor({ state: 'visible' });
      await setAppEnabled(page, true);
    });

    await test.step('App tab shows the app-request AI Assist button', async () => {
      await selectRequestPaneTab(page, 'App');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('app-request')).toBeVisible();
    });
  });

  test('graphql request pane: AI Assist sits in the tab bar, docs only in edit mode', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-assist-graphql';
    const requestName = 'graphql-request-1';

    await test.step('Arrange: create and open a GraphQL request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { requestType: 'graphql' });
      await locators.sidebar.request(requestName).click();
      await locators.tabs.requestTab(requestName).waitFor({ state: 'visible' });
    });

    await test.step('Query tab keeps its own actions and shows no AI Assist button', async () => {
      await selectRequestPaneTab(page, 'Query');
      await expect(locators.aiAssist.trigger('pre-request')).toHaveCount(0);
      await expect(locators.aiAssist.trigger('post-response')).toHaveCount(0);
    });

    await test.step('Tests tab shows the AI Assist button', async () => {
      await selectRequestPaneTab(page, 'Tests');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('tests')).toBeVisible();
    });

    await test.step('Each Script sub-tab shows its own AI Assist button', async () => {
      await selectScriptSubTab(page, 'pre-request');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('pre-request')).toBeVisible();
      await selectScriptSubTab(page, 'post-response');
      await expect(locators.aiAssist.requestPaneTabBarTrigger('post-response')).toBeVisible();
    });

    await test.step('Docs shows the AI Assist button only in edit mode', async () => {
      await selectRequestPaneTab(page, 'Docs');
      await expect(locators.aiAssist.trigger('docs')).toHaveCount(0);

      await locators.docs.editToggle().click();
      await expect(locators.aiAssist.requestPaneTabBarTrigger('docs')).toBeVisible();
    });
  });

  const docsOnlyProtocols = [
    { protocol: 'gRPC', requestType: 'grpc' as const, requestName: 'grpc-request-1' },
    { protocol: 'WebSocket', requestType: 'ws' as const, requestName: 'ws-request-1' }
  ];

  for (const { protocol, requestType, requestName } of docsOnlyProtocols) {
    test(`${protocol} request pane: AI Assist appears only on Docs in edit mode`, async ({ pageWithUserData: page, createTmpDir }) => {
      const locators = buildCommonLocators(page);
      const collectionName = `ai-assist-${requestType}`;

      await test.step(`Arrange: create and open a ${protocol} request`, async () => {
        await createCollection(page, collectionName, await createTmpDir(collectionName));
        await createRequest(page, requestName, collectionName, { requestType });
        await locators.sidebar.request(requestName).click();
        await locators.tabs.requestTab(requestName).waitFor({ state: 'visible' });
      });

      await test.step('Message and Auth tabs show no AI Assist button', async () => {
        await selectRequestPaneTab(page, 'Message');
        await expect(locators.aiAssist.trigger('docs')).toHaveCount(0);
        await selectRequestPaneTab(page, 'Auth');
        await expect(locators.aiAssist.trigger('docs')).toHaveCount(0);
      });

      await test.step('Docs shows the AI Assist button only in edit mode', async () => {
        await selectRequestPaneTab(page, 'Docs');
        await expect(locators.aiAssist.trigger('docs')).toHaveCount(0);

        await locators.docs.editToggle().click();
        await expect(locators.aiAssist.requestPaneTabBarTrigger('docs')).toBeVisible();
      });
    });
  }

  test('collection settings: AI Assist sits in the tab bar, docs only in edit mode', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-assist-collection-settings';

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await openCollectionSettings(page, collectionName);

    await test.step('Tests tab shows the AI Assist button', async () => {
      await selectCollectionPaneTab(page, 'Tests');
      await expect(locators.aiAssist.settingsTabBarTrigger('tests')).toBeVisible();
    });

    await test.step('Each Script sub-tab shows its own AI Assist button', async () => {
      await selectCollectionPaneTab(page, 'Script');
      await selectCollectionScriptPaneTab(page, 'pre-request');
      await expect(locators.aiAssist.settingsTabBarTrigger('pre-request')).toBeVisible();
      await selectCollectionScriptPaneTab(page, 'post-response');
      await expect(locators.aiAssist.settingsTabBarTrigger('post-response')).toBeVisible();
    });

    await test.step('Docs (Overview) shows the AI Assist button only in edit mode', async () => {
      await selectCollectionPaneTab(page, 'Overview');
      await expect(locators.aiAssist.trigger('docs')).toHaveCount(0);

      await locators.docs.editToggle().click();
      await expect(locators.aiAssist.settingsTabBarTrigger('docs')).toBeVisible();
    });
  });

  test('folder settings: AI Assist sits in the tab bar, docs only in edit mode', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-assist-folder-settings';
    const folderName = 'my-folder';

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createFolder(page, folderName, collectionName);
    await openFolderSettings(page, collectionName, folderName);

    await test.step('Test tab shows the AI Assist button', async () => {
      await selectfolderPaneTab(page, 'Test');
      await expect(locators.aiAssist.settingsTabBarTrigger('tests')).toBeVisible();
    });

    await test.step('Each Script sub-tab shows its own AI Assist button', async () => {
      await selectfolderPaneTab(page, 'Script');
      await selectFolderScriptPaneTab(page, 'pre-request');
      await expect(locators.aiAssist.settingsTabBarTrigger('pre-request')).toBeVisible();
      await selectFolderScriptPaneTab(page, 'post-response');
      await expect(locators.aiAssist.settingsTabBarTrigger('post-response')).toBeVisible();
    });

    await test.step('Docs shows the AI Assist button only in edit mode', async () => {
      await selectfolderPaneTab(page, 'Docs');
      await expect(locators.aiAssist.trigger('docs')).toHaveCount(0);

      await locators.docs.editToggle().click();
      await expect(locators.aiAssist.settingsTabBarTrigger('docs')).toBeVisible();
    });
  });
});
