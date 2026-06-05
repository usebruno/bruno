import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';

const COLLECTION_NAME = 'mocker-test-collection';
const COLLECTION_NAME_2 = 'mocker-test-collection-2';
const MOCK_PORT_1 = '4111';
const MOCK_PORT_2 = '4112';

const openMockerTab = async (page: Page) => {
  await page.getByTestId('mocker').click();
  await page.getByTestId('mock-server-dashboard').waitFor({ state: 'visible' });
};

const startMockServer = async (page: Page, port: string) => {
  await page.getByTestId('mock-server-port-input').fill(port);
  await page.getByTestId('mock-server-start-btn').click();
  await expect(page.getByTestId('mock-server-status-text')).toContainText(`Running on port ${port}`, { timeout: 15000 });
};

const stopMockServer = async (page: Page) => {
  await page.getByTestId('mock-server-stop-btn').click();
  await expect(page.getByTestId('mock-server-status-text')).toContainText('Stopped', { timeout: 15000 });
};

const openCollection = async (page: Page, collectionName: string) => {
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
};

const stopServerIfRunning = async (page: Page, collectionName: string) => {
  await openCollection(page, collectionName);
  const mocker = page.getByTestId('mocker');
  if (!(await mocker.isVisible())) {
    return;
  }
  await mocker.click();
  if (await page.getByTestId('mock-server-stop-btn').isVisible()) {
    await stopMockServer(page);
  }
};

test.describe('Status bar mock server indicator', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await stopServerIfRunning(page, COLLECTION_NAME);
    await stopServerIfRunning(page, COLLECTION_NAME_2);
  });

  test('should show inline status bar button for a single running server', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION_NAME);
    await openMockerTab(page);
    await startMockServer(page, MOCK_PORT_1);

    await expect(page.getByTestId(`mock-server-statusbar-btn-${MOCK_PORT_1}`)).toBeVisible();
    await expect(page.getByTestId('mock-server-statusbar-overflow-trigger')).not.toBeVisible();
    await expect(page.getByTestId('mock-server-statusbar-summary')).not.toBeVisible();
  });

  test('should show summary dropdown when active collection has no running server', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION_NAME);
    await openMockerTab(page);
    await startMockServer(page, MOCK_PORT_1);

    await openCollection(page, COLLECTION_NAME_2);

    await expect(page.getByTestId('mock-server-statusbar-summary')).toBeVisible();
    await expect(page.getByTestId('mock-server-statusbar-summary')).toContainText('Mock (1)');
    await expect(page.getByTestId(`mock-server-statusbar-btn-${MOCK_PORT_1}`)).not.toBeVisible();

    await page.getByTestId('mock-server-statusbar-summary').click();
    await expect(page.locator('.dropdown-item').filter({ hasText: `${COLLECTION_NAME} :${MOCK_PORT_1}` })).toBeVisible();
  });

  test('should show active server inline with overflow for additional servers', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION_NAME);
    await openMockerTab(page);
    await startMockServer(page, MOCK_PORT_1);

    await openCollection(page, COLLECTION_NAME_2);
    await openMockerTab(page);
    await startMockServer(page, MOCK_PORT_2);

    await expect(page.getByTestId(`mock-server-statusbar-btn-${MOCK_PORT_2}`)).toBeVisible();
    await expect(page.getByTestId('mock-server-statusbar-overflow-trigger')).toHaveText('+1');

    await page.getByTestId('mock-server-statusbar-overflow-trigger').click();
    const overflowItem = page.locator('.dropdown-item').filter({ hasText: `${COLLECTION_NAME} :${MOCK_PORT_1}` });
    await expect(overflowItem).toBeVisible();

    await overflowItem.click();
    await expect(page.getByTestId('mock-server-dashboard')).toBeVisible();
    await expect(page.getByTestId('mock-server-port-input')).toHaveValue(MOCK_PORT_1);
  });

  test('should hide status bar indicator when no servers are running', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION_NAME);
    await openMockerTab(page);

    await expect(page.getByTestId(`mock-server-statusbar-btn-${MOCK_PORT_1}`)).not.toBeVisible();
    await expect(page.getByTestId('mock-server-statusbar-summary')).not.toBeVisible();
    await expect(page.getByTestId('mock-server-statusbar-overflow-trigger')).not.toBeVisible();
  });
});
