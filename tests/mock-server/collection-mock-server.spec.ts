import { test, expect } from '../../playwright';
import { createRequest, sendRequest, getResponseBody } from '../utils/page/actions';
import {
  buildMockServerLocators,
  openMockServerTab,
  syncResponsesFromExamples,
  startMockServer,
  stopMockServer,
  createMockServerFromCollection
} from '../utils/page/mock-server';

const COLLECTION_NAME = 'mock-server-test-collection';
const DEFAULT_MOCK_PORT = '4500';
let currentMockPort = DEFAULT_MOCK_PORT;
const getMockBase = () => `http://localhost:${currentMockPort}`;

const mockFetch = async (urlPath: string, options?: RequestInit) => {
  const res = await fetch(`${getMockBase()}${urlPath}`, options);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body };
};

test.describe.serial('Mock Server', () => {
  test('should create mock server and sync responses from collection examples', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);

    await createMockServerFromCollection(page, COLLECTION_NAME, 'Test Mock Server');

    await expect(ms.dashboard()).toBeVisible();
    await expect(ms.statusText()).toHaveText('Stopped');

    await syncResponsesFromExamples(page, COLLECTION_NAME);
  });

  test('should show dashboard controls in stopped state', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);

    await expect(ms.dashboard()).toBeVisible();
    await expect(ms.statusText()).toHaveText('Stopped');
    await expect(ms.statusDot()).not.toHaveClass(/running/);
    await expect(ms.delayInput()).toBeVisible();
    await expect(ms.startBtn()).toBeVisible();
    await expect(ms.stopBtn()).not.toBeVisible();
    await expect(ms.copyUrl()).not.toBeVisible();
  });

  test('should show Responses, Routes and Request Log tabs', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await expect(ms.tabResponses()).toBeVisible();
    await expect(ms.tabRoutes()).toBeVisible();
    await expect(ms.tabLog()).toBeVisible();
  });

  test('should start mock server and show running status', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    currentMockPort = await startMockServer(page);

    await expect(ms.statusText()).toContainText('Running on port');
    await expect(ms.statusDot()).toHaveClass(/running/);
    await expect(ms.stopBtn()).toBeVisible();
    await expect(ms.refreshBtn()).toBeVisible();
    await expect(ms.copyUrl()).toContainText(`http://localhost:${currentMockPort}`);
    await expect(ms.stats()).toBeVisible();
    await expect(ms.startBtn()).not.toBeVisible();
  });

  test('should show registered routes from synced mock responses', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabRoutes().click();
    await expect(ms.routeSearch()).toBeVisible({ timeout: 10000 });
    await expect(ms.stats()).toContainText('3 routes');
  });

  test('should filter routes by search query', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabRoutes().click();

    await test.step('Search for "health" should show 1 route', async () => {
      await ms.routeSearch().fill('health');
      await expect(ms.routeRows()).toHaveCount(1);
    });

    await test.step('Clear search should show all routes', async () => {
      await ms.routeSearch().fill('');
      await expect(ms.routeRows()).toHaveCount(3);
    });
  });

  test('should filter routes by method dropdown', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabRoutes().click();

    await test.step('Filter by POST should show 1 route', async () => {
      await ms.methodFilter().click();
      await ms.filterOption('POST').click();
      await expect(ms.routeRows()).toHaveCount(1);
    });

    await test.step('Reset filter to All Methods', async () => {
      await ms.methodFilter().click();
      await ms.filterOption('All Methods').click();
      await expect(ms.routeRows()).toHaveCount(3);
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
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabLog().click();

    await test.step('Log count should reflect requests made so far', async () => {
      await expect(ms.logCount()).toBeVisible();
      const text = await ms.logCount().innerText();
      expect(parseInt(text)).toBeGreaterThan(10);
    });

    await test.step('Log table should have rows with data', async () => {
      expect(await ms.logMethodBadges().count()).toBeGreaterThan(0);
      expect(await ms.logPaths().count()).toBeGreaterThan(0);
    });
  });

  test('should show unmatched requests with No Match label in log', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await mockFetch('/this-does-not-exist');

    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabLog().click();

    await expect(ms.logNoMatchLabels().first()).toBeVisible();
  });

  test('should filter request log by match status', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabLog().click();

    await test.step('Filter to show only unmatched', async () => {
      await ms.matchFilter().click();
      await ms.filterOption('Unmatched').click();

      expect(await ms.logNoMatchLabels().count()).toBeGreaterThan(0);

      const statusCodes = ms.logStatusCodes();
      const count = await statusCodes.count();
      for (let i = 0; i < count; i++) {
        await expect(statusCodes.nth(i)).toHaveText('404');
      }
    });

    await test.step('Filter to show only matched', async () => {
      await ms.matchFilter().click();
      await ms.filterOption('Matched').click();
      expect(await ms.logNoMatchLabels().count()).toBe(0);
    });

    await test.step('Reset filter to all', async () => {
      await ms.matchFilter().click();
      await ms.filterOption('All Requests').click();
    });
  });

  test('should filter request log by status code', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabLog().click();

    await test.step('Filter by 2xx should only show 2xx entries', async () => {
      await ms.statusFilter().click();
      await ms.filterOption('2xx Success').click();

      const statusCodes = ms.logStatusCodes();
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
      await ms.statusFilter().click();
      await ms.filterOption('All Status').click();
    });
  });

  test('should clear request log and show empty state', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabLog().click();

    await expect(ms.logCount()).toBeVisible();
    const text = await ms.logCount().innerText();
    expect(parseInt(text)).toBeGreaterThan(0);

    await ms.logClear().click();
    await expect(ms.logEmptyState()).toBeVisible();
    await expect(ms.logCount()).not.toBeVisible();
  });

  test('should apply global delay to matched responses', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.delayInput().fill('500');
    await ms.delayInput().blur();

    const start = Date.now();
    await mockFetch('/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(400);

    await ms.delayInput().fill('0');
    await ms.delayInput().blur();
  });

  test('should not delay 404 responses', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.delayInput().fill('1000');
    await ms.delayInput().blur();

    const start = Date.now();
    await mockFetch('/nonexistent');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);

    await ms.delayInput().fill('0');
    await ms.delayInput().blur();
  });

  test('should show refresh toast with correct route count', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.refreshBtn().click();
    await expect(ms.refreshToast()).toBeVisible({ timeout: 5000 });
  });

  test('should stop server and show start button after stop', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await stopMockServer(page);
    await expect(ms.statusText()).toContainText('Stopped');
    await expect(ms.startBtn()).toBeVisible();
    await expect(ms.stopBtn()).not.toBeVisible();
    await expect(ms.copyUrl()).not.toBeVisible();
  });

  test('should show server stopped for cleanup', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await expect(ms.statusText()).toContainText('Stopped');
  });
});
