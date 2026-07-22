import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import { createRequest, sendRequest, getResponseBody } from '../utils/page/actions';

const COLLECTION_NAME = 'mock-server-test-collection';
const DEFAULT_MOCK_PORT = '4500';
let currentMockPort = DEFAULT_MOCK_PORT;
const getMockBase = () => `http://localhost:${currentMockPort}`;

const openMockServerTab = async (page: Page) => {
  await page.locator('#sidebar-collection-name').filter({ hasText: new RegExp(`^${COLLECTION_NAME}$`) }).click();
  await page.getByTestId('mock-server').click();
  await page.getByTestId('mock-server-dashboard').waitFor({ state: 'visible' });
};

const syncResponsesFromExamples = async (page: Page) => {
  await openMockServerTab(page);
  await page.getByTestId('mock-server-tab-responses').click();
  await expect(page.getByTestId('mock-response-sync-examples-btn')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('mock-response-sync-examples-btn').click();
  await expect(page.getByTestId('sync-mock-examples-modal')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('sync-mock-examples-modal-submit-btn').click();
  await expect(page.getByText('Mock responses synced with collection examples')).toBeVisible({ timeout: 10000 });
};

const startMockServer = async (page: Page) => {
  await page.getByTestId('mock-server-start-btn').click();
  const statusText = page.getByTestId('mock-server-status-text');
  await expect(statusText).toContainText('Running on port', { timeout: 15000 });
  const text = await statusText.innerText();
  const portMatch = text.match(/Running on port (\d+)/);
  currentMockPort = portMatch ? portMatch[1] : DEFAULT_MOCK_PORT;
};

const stopMockServer = async (page: Page) => {
  await page.getByTestId('mock-server-stop-btn').click();
  await expect(page.getByTestId('mock-server-status-text')).toContainText('Stopped', { timeout: 15000 });
};

const mockFetch = async (urlPath: string, options?: RequestInit) => {
  const res = await fetch(`${getMockBase()}${urlPath}`, options);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body };
};

test.describe.serial('Mock Server', () => {
  test('should create mock server and sync responses from collection examples', async ({ pageWithUserData: page }) => {
    const collection = page.getByTestId('sidebar-collection-row').filter({ hasText: new RegExp(`^${COLLECTION_NAME}$`) });
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();

    const createMockServerBtn = page.getByTestId('collection-actions-create-mock-server');
    await expect(createMockServerBtn).toBeVisible({ timeout: 10000 });
    await createMockServerBtn.click();

    await expect(page.locator('.bruno-modal-card')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('mock-server-name-input').fill('Test Mock Server');
    await page.getByTestId('modal-submit-btn').click();

    await expect(page.getByTestId('mock-server-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('mock-server-status-text')).toHaveText('Stopped');

    await syncResponsesFromExamples(page);
  });

  test('should show dashboard controls in stopped state', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: new RegExp(`^${COLLECTION_NAME}$`) }).click();
    await openMockServerTab(page);

    await expect(page.getByTestId('mock-server-dashboard')).toBeVisible();
    await expect(page.getByTestId('mock-server-status-text')).toHaveText('Stopped');
    await expect(page.getByTestId('mock-server-status-dot')).not.toHaveClass(/running/);
    await expect(page.getByTestId('mock-server-delay-input')).toBeVisible();
    await expect(page.getByTestId('mock-server-start-btn')).toBeVisible();
    await expect(page.getByTestId('mock-server-stop-btn')).not.toBeVisible();
    await expect(page.getByTestId('mock-server-copy-url')).not.toBeVisible();
  });

  test('should show Responses, Routes and Request Log tabs', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await expect(page.getByTestId('mock-server-tab-responses')).toBeVisible();
    await expect(page.getByTestId('mock-server-tab-routes')).toBeVisible();
    await expect(page.getByTestId('mock-server-tab-log')).toBeVisible();
  });

  test('should start mock server and show running status', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await startMockServer(page);

    await expect(page.getByTestId('mock-server-status-dot')).toHaveClass(/running/);
    await expect(page.getByTestId('mock-server-stop-btn')).toBeVisible();
    await expect(page.getByTestId('mock-server-refresh-btn')).toBeVisible();
    await expect(page.getByTestId('mock-server-copy-url')).toContainText(`http://localhost:${currentMockPort}`);
    await expect(page.getByTestId('mock-server-stats')).toBeVisible();
    await expect(page.getByTestId('mock-server-start-btn')).not.toBeVisible();
  });

  test('should show registered routes from synced mock responses', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-routes').click();
    await expect(page.getByTestId('mock-server-route-search')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('mock-server-stats')).toContainText('3 routes');
  });

  test('should filter routes by search query', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-routes').click();

    await test.step('Search for "health" should show 1 route', async () => {
      await page.getByTestId('mock-server-route-search').fill('health');
      const rows = page.locator('.table-container table tbody tr');
      await expect(rows).toHaveCount(1);
    });

    await test.step('Clear search should show all routes', async () => {
      await page.getByTestId('mock-server-route-search').fill('');
      const rows = page.locator('.table-container table tbody tr');
      await expect(rows).toHaveCount(3);
    });
  });

  test('should filter routes by method dropdown', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-routes').click();

    await test.step('Filter by POST should show 1 route', async () => {
      await page.getByTestId('mock-server-method-filter').click();
      await page.locator('.filter-option-label').getByText('POST').click();
      const rows = page.locator('.table-container table tbody tr');
      await expect(rows).toHaveCount(1);
    });

    await test.step('Reset filter to All Methods', async () => {
      await page.getByTestId('mock-server-method-filter').click();
      await page.locator('.filter-option-label').getByText('All Methods', { exact: true }).click();
      const rows = page.locator('.table-container table tbody tr');
      await expect(rows).toHaveCount(3);
    });
  });

  test('should return 200 for GET /health', async () => {
    const response = await mockFetch('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('should return 200 for GET /users/1', async () => {
    const response = await mockFetch('/users/1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 1, name: 'John Doe', email: 'john@example.com' });
  });

  test('should return 201 for POST /users', async () => {
    const response = await mockFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' })
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 2, name: 'New User', email: 'new@example.com' });
  });

  test('should return 404 with helpful error for unmatched path', async () => {
    const response = await mockFetch('/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('No mock response found');
    expect(response.body.method).toBe('GET');
    expect(response.body.path).toBe('/nonexistent');
    expect(response.body.hint).toContain('Create a mock response');
    expect(Array.isArray(response.body.availableRoutes)).toBe(true);
    expect(response.body.availableRoutes.length).toBe(3);
  });

  test('should return 404 for wrong method on existing path', async () => {
    const response = await mockFetch('/health', { method: 'DELETE' });
    expect(response.status).toBe(404);
    expect(response.body.method).toBe('DELETE');
  });

  test('should return 404 for partial path match', async () => {
    const response = await mockFetch('/users/999');
    expect(response.status).toBe(404);
  });

  test('should include CORS headers on every response', async () => {
    const matched = await mockFetch('/health');
    expect(matched.headers.get('access-control-allow-origin')).toBe('*');

    const unmatched = await mockFetch('/nonexistent');
    expect(unmatched.headers.get('access-control-allow-origin')).toBe('*');
  });

  test('should set application/json content-type for JSON examples', async () => {
    const response = await mockFetch('/health');
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  test('should not forward transport-level headers from saved examples', async () => {
    const response = await mockFetch('/health');
    expect(response.headers.get('transfer-encoding')).toBeNull();
    expect(response.headers.get('content-encoding')).toBeNull();
  });

  test('should forward custom headers from example', async () => {
    const response = await mockFetch('/users/1');
    expect(response.headers.get('x-custom-header')).toBe('test-value');
  });

  test('should handle OPTIONS preflight with 204', async () => {
    const res = await fetch(`${getMockBase()}/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  test('should normalize trailing slash', async () => {
    const response = await mockFetch('/health/');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('should handle root path', async () => {
    const response = await mockFetch('/');
    expect(response.status).toBe(404);
    expect(response.body.path).toBe('/');
  });

  test('should create and send request to mock /health via Bruno', async ({ pageWithUserData: page }) => {
    await createRequest(page, 'mock-health-check', COLLECTION_NAME, {
      url: `http://localhost:${currentMockPort}/health`
    });
    await sendRequest(page, 200);
    const body = await getResponseBody(page);
    expect(body).toContain('"status"');
    expect(body).toContain('"ok"');
  });

  test('should create and send request to mock /users/1 via Bruno', async ({ pageWithUserData: page }) => {
    await createRequest(page, 'mock-get-user', COLLECTION_NAME, {
      url: `http://localhost:${currentMockPort}/users/1`
    });
    await sendRequest(page, 200);
    const body = await getResponseBody(page);
    expect(body).toContain('John Doe');
    expect(body).toContain('john@example.com');
  });

  test('should create and send POST request to mock /users via Bruno', async ({ pageWithUserData: page }) => {
    await createRequest(page, 'mock-create-user', COLLECTION_NAME, {
      url: `http://localhost:${currentMockPort}/users`,
      method: 'POST'
    });
    await sendRequest(page, 201);
    const body = await getResponseBody(page);
    expect(body).toContain('New User');
  });

  test('should show all requests in request log after Bruno sends', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-log').click();

    await test.step('Log count should reflect requests made so far', async () => {
      const logCount = page.getByTestId('mock-server-log-count');
      await expect(logCount).toBeVisible();
      const text = await logCount.innerText();
      expect(parseInt(text)).toBeGreaterThan(10);
    });

    await test.step('Log table should have rows with data', async () => {
      const methodBadges = page.locator('.log-table-container .method-badge');
      expect(await methodBadges.count()).toBeGreaterThan(0);

      const paths = page.locator('.log-table-container .log-path');
      expect(await paths.count()).toBeGreaterThan(0);
    });
  });

  test('should show unmatched requests with No Match label in log', async ({ pageWithUserData: page }) => {
    await mockFetch('/this-does-not-exist');

    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-log').click();
    await page.waitForTimeout(500);

    const noMatchLabels = page.locator('.log-table-container .no-match-label');
    expect(await noMatchLabels.count()).toBeGreaterThan(0);
  });

  test('should filter request log by match status', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-log').click();

    await test.step('Filter to show only unmatched', async () => {
      await page.getByTestId('mock-server-match-filter').click();
      await page.locator('.filter-option-label').getByText('Unmatched', { exact: true }).click();

      const noMatchLabels = page.locator('.log-table-container .no-match-label');
      expect(await noMatchLabels.count()).toBeGreaterThan(0);

      const statusCodes = page.locator('.log-table-container .status-code');
      const count = await statusCodes.count();
      for (let i = 0; i < count; i++) {
        await expect(statusCodes.nth(i)).toHaveText('404');
      }
    });

    await test.step('Filter to show only matched', async () => {
      await page.getByTestId('mock-server-match-filter').click();
      await page.locator('.filter-option-label').getByText('Matched', { exact: true }).click();
      const noMatchLabels = page.locator('.log-table-container .no-match-label');
      expect(await noMatchLabels.count()).toBe(0);
    });

    await test.step('Reset filter to all', async () => {
      await page.getByTestId('mock-server-match-filter').click();
      await page.locator('.filter-option-label').getByText('All Requests', { exact: true }).click();
    });
  });

  test('should filter request log by status code', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-log').click();

    await test.step('Filter by 2xx should only show 2xx entries', async () => {
      await page.getByTestId('mock-server-status-filter').click();
      await page.locator('.filter-option-label').getByText('2xx Success', { exact: true }).click();

      const statusCodes = page.locator('.log-table-container .status-code');
      const count = await statusCodes.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const text = await statusCodes.nth(i).innerText();
        const code = parseInt(text);
        expect(code).toBeGreaterThanOrEqual(200);
        expect(code).toBeLessThan(300);
      }
    });

    await test.step('Reset filter', async () => {
      await page.getByTestId('mock-server-status-filter').click();
      await page.locator('.filter-option-label').getByText('All Status', { exact: true }).click();
    });
  });

  test('should clear request log and show empty state', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-tab-log').click();

    const logCount = page.getByTestId('mock-server-log-count');
    await expect(logCount).toBeVisible();
    const text = await logCount.innerText();
    expect(parseInt(text)).toBeGreaterThan(0);

    await page.getByTestId('mock-server-log-clear').click();
    await expect(page.getByText('No requests logged yet')).toBeVisible();
    await expect(logCount).not.toBeVisible();
  });

  test('should apply global delay to matched responses', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-delay-input').fill('500');
    await page.getByTestId('mock-server-delay-input').blur();

    const start = Date.now();
    await mockFetch('/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(400);

    await page.getByTestId('mock-server-delay-input').fill('0');
    await page.getByTestId('mock-server-delay-input').blur();
  });

  test('should not delay 404 responses', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-delay-input').fill('1000');
    await page.getByTestId('mock-server-delay-input').blur();

    const start = Date.now();
    await mockFetch('/nonexistent');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);

    await page.getByTestId('mock-server-delay-input').fill('0');
    await page.getByTestId('mock-server-delay-input').blur();
  });

  test('should show refresh toast with correct route count', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await page.getByTestId('mock-server-refresh-btn').click();
    await expect(page.getByText(/Routes refreshed.*routes/).first()).toBeVisible({ timeout: 5000 });
  });

  test('should stop server and show start button after stop', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await stopMockServer(page);
    await expect(page.getByTestId('mock-server-start-btn')).toBeVisible();
    await expect(page.getByTestId('mock-server-stop-btn')).not.toBeVisible();
    await expect(page.getByTestId('mock-server-copy-url')).not.toBeVisible();
  });

  test('should show server stopped for cleanup', async ({ pageWithUserData: page }) => {
    await openMockServerTab(page);
    await expect(page.getByTestId('mock-server-status-text')).toContainText('Stopped');
  });
});
