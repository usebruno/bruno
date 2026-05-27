import { test, expect } from '../../../playwright';
import {
  AUTH_MODE_LABELS,
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  openRequest,
  saveRequest,
  selectAuthMode,
  selectRequestPaneTab
} from '../../utils/page';

test.describe('Modified indicator for auth tab', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Folder Auth tab indicator dot reflects effective auth (shows on inherit, hides on No Auth)', async ({ page, createTmpDir }) => {
    const collectionName = 'modified-indicator-collection';
    const locators = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, await createTmpDir());
    });

    await test.step('Set auth type for the collection as Bearer Token', async () => {
      await locators.paneTabs.collectionSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify the collection auth mode shows Bearer Token', async () => {
      await expect(locators.auth.modeSelector()).toContainText(AUTH_MODE_LABELS.BEARER);
    });

    await test.step('Create folder-1 inside the collection and set auth type for folder-1 as Inherit', async () => {
      await createFolder(page, 'folder-1', collectionName, true);
      await locators.sidebar.folder('folder-1').dblclick();
      await locators.paneTabs.folderSettingsTab('auth').click();
      await selectAuthMode(page, AUTH_MODE_LABELS.INHERIT);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify folder-1 inherits Bearer Token from the collection', async () => {
      await expect(page.getByText('Auth inherited from Collection:')).toBeVisible();
      await expect(locators.auth.inheritedMode()).toHaveText(AUTH_MODE_LABELS.BEARER);
    });

    await test.step('Verify the Auth tab shows the status dot for folder-1 (inheriting Bearer Token)', async () => {
      await expect(
        locators.paneTabs.folderSettingsTab('auth').getByTestId('status-dot-auth')
      ).toBeVisible();
    });

    await test.step('Change folder-1 auth type to No Auth', async () => {
      await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('Verify the Auth tab does NOT show the status dot for folder-1 (No Auth)', async () => {
      await expect(
        locators.paneTabs.folderSettingsTab('auth').getByTestId('status-dot-auth')
      ).toBeHidden();
    });
  });

  const requestProtocolCases = [
    { protocol: 'HTTP', requestType: 'HTTP' as const, requestName: 'http-request-1', url: 'https://example.com/api' },
    { protocol: 'gRPC', requestType: 'gRPC' as const, requestName: 'grpc-request-1', url: 'grpc://localhost:50051' },
    { protocol: 'WebSocket', requestType: 'WebSocket' as const, requestName: 'ws-request-1', url: 'ws://localhost:8080' },
    { protocol: 'GraphQL', requestType: 'GraphQL' as const, requestName: 'graphql-request-1', url: 'https://example.com/graphql' }
  ];

  for (const { protocol, requestType, requestName, url } of requestProtocolCases) {
    test(`${protocol} request inheriting auth from its folder shows the modified indicator dot`, async ({ page, createTmpDir }) => {
      const collectionName = `${protocol.toLowerCase()}-inherit-indicator-collection`;
      const locators = buildCommonLocators(page);

      await test.step('Create a collection', async () => {
        await createCollection(page, collectionName, await createTmpDir());
      });

      await test.step('Set auth type for the collection as Bearer Token', async () => {
        await locators.paneTabs.collectionSettingsTab('auth').click();
        await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
        await page.getByRole('button', { name: 'Save' }).click();
      });

      await test.step('Create folder-1 inside the collection and set auth type for folder-1 as Basic Auth', async () => {
        await createFolder(page, 'folder-1', collectionName, true);
        await locators.sidebar.folder('folder-1').dblclick();
        await locators.paneTabs.folderSettingsTab('auth').click();
        await selectAuthMode(page, AUTH_MODE_LABELS.BASIC);
        await page.getByRole('button', { name: 'Save' }).click();
      });

      await test.step(`Create a ${protocol} request inside folder-1 and set auth type for the request as Inherit`, async () => {
        await createRequest(page, requestName, 'folder-1', { inFolder: true, requestType, url });
        await openRequest(page, collectionName, requestName);
        await selectRequestPaneTab(page, 'Auth');
        await selectAuthMode(page, AUTH_MODE_LABELS.INHERIT);
        await saveRequest(page);
      });

      await test.step(`Verify the ${protocol} request Auth tab shows the status dot (inheriting Basic Auth from folder-1)`, async () => {
        await expect(
          locators.paneTabs.responsiveTab('auth').getByTestId('status-dot-auth')
        ).toBeVisible();
      });

      await test.step(`Change the ${protocol} request auth type to No Auth and verify the dot disappears`, async () => {
        await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
        await saveRequest(page);
        await expect(
          locators.paneTabs.responsiveTab('auth').getByTestId('status-dot-auth')
        ).toBeHidden();
      });

      await test.step(`Change the ${protocol} request auth type to Basic Auth and verify the dot appears`, async () => {
        await selectAuthMode(page, AUTH_MODE_LABELS.BASIC);
        await saveRequest(page);
        await expect(
          locators.paneTabs.responsiveTab('auth').getByTestId('status-dot-auth')
        ).toBeVisible();
      });

      await test.step('Change folder-1 auth type to No Auth', async () => {
        await locators.sidebar.folder('folder-1').dblclick();
        await locators.paneTabs.folderSettingsTab('auth').click();
        await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
        await page.getByRole('button', { name: 'Save' }).click();
      });

      await test.step(`Set the ${protocol} request auth back to Inherit and verify the dot is hidden (folder is No Auth)`, async () => {
        await openRequest(page, collectionName, requestName);
        await selectRequestPaneTab(page, 'Auth');
        await selectAuthMode(page, AUTH_MODE_LABELS.INHERIT);
        await saveRequest(page);
        await expect(
          locators.paneTabs.responsiveTab('auth').getByTestId('status-dot-auth')
        ).toBeHidden();
      });
    });
  }
});
