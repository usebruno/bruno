import { once } from 'node:events';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeAllTabs,
  createCollection,
  createRequest,
  openRequest
} from '../../../pages';
import { startLocalServer } from '../../../servers';

const fastUrl = 'http://localhost:8081/ping';

test.describe('Request activity indicator', () => {
  const collectionName = 'request-activity-indicator';
  const slowRequest = 'Slow Request';
  const otherRequest = 'Other Request';
  // No handler: the slow request stays pending until a test answers it, instead of racing a timer.
  let slowServer: Awaited<ReturnType<typeof startLocalServer>>;

  test.beforeAll(async ({ page, createTmpDir }) => {
    slowServer = await startLocalServer();
    await page.locator('[data-app-state="loaded"]').waitFor();
    const collectionPath = await createTmpDir('request-activity-indicator');
    await createCollection(page, collectionName, collectionPath);
    await createRequest(page, slowRequest, collectionName, { url: slowServer.url, method: 'GET' });
    await createRequest(page, otherRequest, collectionName, { url: fastUrl, method: 'GET' });
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
    slowServer.close();
  });

  test('shows a spinner while a request runs in the background, then its unseen status code', async ({ page }) => {
    const locators = buildCommonLocators(page);
    const slowRequestReceived = once(slowServer.server, 'request');

    await test.step('Send the slow request and switch to another request', async () => {
      // Persisted tabs, so opening the other request does not replace the slow request's preview tab.
      await openRequest(page, collectionName, slowRequest, { persist: true });
      await locators.request.sendButton().click();
      await openRequest(page, collectionName, otherRequest, { persist: true });
    });

    await test.step('The slow request shows a spinner in the sidebar and in its tab', async () => {
      await expect(locators.sidebar.itemRunningIndicator(slowRequest)).toBeVisible();
      await expect(locators.tabs.tabRunningIndicator(slowRequest)).toBeVisible();
      await expect(locators.sidebar.itemRunningIndicator(otherRequest)).toHaveCount(0);
    });

    await test.step('Once finished, the slow request shows its unseen status code', async () => {
      const [, slowResponse] = await slowRequestReceived;
      slowResponse.end();
      const sidebarBadge = locators.sidebar.itemUnseenResponseBadge(slowRequest);
      const tabBadge = locators.tabs.tabUnseenResponseBadge(slowRequest);
      await expect(sidebarBadge).toHaveText('200');
      await expect(sidebarBadge).toBeVisible();
      await expect(tabBadge).toHaveText('200');
      await expect(tabBadge).toBeVisible();
      await expect(locators.sidebar.itemRunningIndicator(slowRequest)).toHaveCount(0);
    });

    await test.step('Opening the slow request clears its unseen status code', async () => {
      await openRequest(page, collectionName, slowRequest, { persist: true });
      await expect(locators.sidebar.itemUnseenResponseBadge(slowRequest)).toHaveCount(0);
      await expect(locators.tabs.tabUnseenResponseBadge(slowRequest)).toHaveCount(0);
    });
  });

  test('keeps the unseen status code of a request whose tab was closed while it ran', async ({ page }) => {
    const locators = buildCommonLocators(page);
    const slowRequestReceived = once(slowServer.server, 'request');

    await test.step('Send the slow request, then close its tab', async () => {
      await closeAllTabs(page);
      await openRequest(page, collectionName, slowRequest);
      await locators.request.sendButton().click();
      await locators.tabs.closeTab(slowRequest).click({ force: true });
      await expect(locators.tabs.requestTab(slowRequest)).toHaveCount(0);
    });

    await test.step('The tabless slow request shows a spinner, then its unseen status code', async () => {
      await expect(locators.sidebar.itemRunningIndicator(slowRequest)).toBeVisible();
      const [, slowResponse] = await slowRequestReceived;
      slowResponse.end();
      const sidebarBadge = locators.sidebar.itemUnseenResponseBadge(slowRequest);
      await expect(sidebarBadge).toHaveText('200');
      await expect(sidebarBadge).toBeVisible();
    });

    await test.step('Opening the slow request clears its unseen status code', async () => {
      await openRequest(page, collectionName, slowRequest);
      await expect(locators.sidebar.itemUnseenResponseBadge(slowRequest)).toHaveCount(0);
    });
  });
});
