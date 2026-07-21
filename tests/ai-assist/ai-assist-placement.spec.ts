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
  selectScriptSubTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('AI Assist tab-bar placement', () => {
  test.afterEach(async ({ pageWithUserData }) => {
    await closeAllCollections(pageWithUserData);
  });

  test('request pane: AI Assist sits in the tab bar, docs only in edit mode', async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
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
      await expect(page.getByTestId('ai-assist-trigger-tests')).toBeVisible();
    });

    await test.step('Each Script sub-tab shows its own AI Assist button', async () => {
      await selectScriptSubTab(page, 'pre-request');
      await expect(page.getByTestId('ai-assist-trigger-pre-request')).toBeVisible();
      await selectScriptSubTab(page, 'post-response');
      await expect(page.getByTestId('ai-assist-trigger-post-response')).toBeVisible();
    });

    await test.step('Docs shows the AI Assist button only in edit mode', async () => {
      await selectRequestPaneTab(page, 'Docs');
      const docsTrigger = page.getByTestId('ai-assist-trigger-docs');
      await expect(docsTrigger).toHaveCount(0);

      await page.locator('[data-testid="request-pane"] .editing-mode').click();
      await expect(docsTrigger).toBeVisible();
    });
  });

  test('collection settings: AI Assist sits in the tab bar, docs only in edit mode', async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    const collectionName = 'ai-assist-collection-settings';

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await openCollectionSettings(page, collectionName);

    await test.step('Tests tab shows the AI Assist button', async () => {
      await selectCollectionPaneTab(page, 'Tests');
      await expect(page.getByTestId('ai-assist-trigger-tests')).toBeVisible();
    });

    await test.step('Each Script sub-tab shows its own AI Assist button', async () => {
      await selectCollectionPaneTab(page, 'Script');
      await selectCollectionScriptPaneTab(page, 'pre-request');
      await expect(page.getByTestId('ai-assist-trigger-pre-request')).toBeVisible();
      await selectCollectionScriptPaneTab(page, 'post-response');
      await expect(page.getByTestId('ai-assist-trigger-post-response')).toBeVisible();
    });

    await test.step('Docs (Overview) shows the AI Assist button only in edit mode', async () => {
      await selectCollectionPaneTab(page, 'Overview');
      const docsTrigger = page.getByTestId('ai-assist-trigger-docs');
      await expect(docsTrigger).toHaveCount(0);

      await page.locator('.editing-mode').click();
      await expect(docsTrigger).toBeVisible();
    });
  });

  test('folder settings: AI Assist sits in the tab bar, docs only in edit mode', async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    const collectionName = 'ai-assist-folder-settings';
    const folderName = 'my-folder';

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createFolder(page, folderName, collectionName);
    await openFolderSettings(page, collectionName, folderName);

    await test.step('Test tab shows the AI Assist button', async () => {
      await selectfolderPaneTab(page, 'Test');
      await expect(page.getByTestId('ai-assist-trigger-tests')).toBeVisible();
    });

    await test.step('Each Script sub-tab shows its own AI Assist button', async () => {
      await selectfolderPaneTab(page, 'Script');
      await selectFolderScriptPaneTab(page, 'pre-request');
      await expect(page.getByTestId('ai-assist-trigger-pre-request')).toBeVisible();
      await selectFolderScriptPaneTab(page, 'post-response');
      await expect(page.getByTestId('ai-assist-trigger-post-response')).toBeVisible();
    });

    await test.step('Docs shows the AI Assist button only in edit mode', async () => {
      await selectfolderPaneTab(page, 'Docs');
      const docsTrigger = page.getByTestId('ai-assist-trigger-docs');
      await expect(docsTrigger).toHaveCount(0);

      await page.locator('.editing-mode').click();
      await expect(docsTrigger).toBeVisible();
    });
  });
});
