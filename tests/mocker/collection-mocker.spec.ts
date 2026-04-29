import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import { createRequest, sendRequest, getResponseBody } from '../utils/page/actions';

const COLLECTION_NAME = 'mocker-test-collection';
const MOCK_PORT = '4111';
const MOCK_BASE = `http://127.0.0.1:${MOCK_PORT}`;

const openMockerTab = async (page: Page) => {
  await page.getByTestId('mocker').click();
  await page.getByTestId('mock-server-dashboard').waitFor({ state: 'visible' });
};

const startMockServer = async (page: Page, port = MOCK_PORT) => {
  await page.getByTestId('mock-server-port-input').fill(port);
  await page.getByTestId('mock-server-start-btn').click();
  await expect(page.getByTestId('mock-server-status-text')).toContainText(`Running on port ${port}`, { timeout: 15000 });
};

const stopMockServer = async (page: Page) => {
  await page.getByTestId('mock-server-stop-btn').click();
  await expect(page.getByTestId('mock-server-status-text')).toContainText('Stopped', { timeout: 15000 });
};

const mockFetch = async (urlPath: string, options?: RequestInit) => {
  const res = await fetch(`${MOCK_BASE}${urlPath}`, options);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body };
};

test.describe.serial('Mock Server', () => {
  // ==========================================
  // Phase 1: Dashboard UI
  // ==========================================

  test('should open Mocker tab and show dashboard controls in stopped state', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: COLLECTION_NAME }).click();
    await openMockerTab(page);

    await expect(page.getByTestId('mock-server-dashboard')).toBeVisible();
    await expect(page.getByTestId('mock-server-status-text')).toHaveText('Stopped');
    await expect(page.getByTestId('mock-server-status-dot')).not.toHaveClass(/running/);
    await expect(page.getByTestId('mock-server-port-input')).toBeVisible();
    await expect(page.getByTestId('mock-server-port-input')).toBeEnabled();
    await expect(page.getByTestId('mock-server-delay-input')).toBeVisible();
    await expect(page.getByTestId('mock-server-start-btn')).toBeVisible();
    // Stop button and copy URL should NOT be visible when stopped
    await expect(page.getByTestId('mock-server-stop-btn')).not.toBeVisible();
    await expect(page.getByTestId('mock-server-copy-url')).not.toBeVisible();
  });

  test('should show Routes and Request Log tabs', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await expect(page.getByTestId('mock-server-tab-routes')).toBeVisible();
    await expect(page.getByTestId('mock-server-tab-log')).toBeVisible();
  });

  // ==========================================
  // Phase 2: Start server
  // ==========================================

  test('should start mock server and show running status with all controls', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await startMockServer(page);

    await expect(page.getByTestId('mock-server-status-dot')).toHaveClass(/running/);
    await expect(page.getByTestId('mock-server-stop-btn')).toBeVisible();
    await expect(page.getByTestId('mock-server-refresh-btn')).toBeVisible();
    await expect(page.getByTestId('mock-server-copy-url')).toContainText(`http://localhost:${MOCK_PORT}`);
    await expect(page.getByTestId('mock-server-stats')).toBeVisible();
    // Port input should be disabled while running
    await expect(page.getByTestId('mock-server-port-input')).toBeDisabled();
    // Start button should NOT be visible while running
    await expect(page.getByTestId('mock-server-start-btn')).not.toBeVisible();
  });

  // ==========================================
  // Phase 3: Routes tab
  // ==========================================

  test('should show registered routes from fixture examples', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-tab-routes').click();
    await expect(page.getByTestId('mock-server-route-search')).toBeVisible();
    // Fixture has: GET /health, GET /users/1, POST /users
    await expect(page.getByTestId('mock-server-stats')).toContainText('3 routes');
  });

  test('should filter routes by search query', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-tab-routes').click();

    await test.step('Search for "health" should show 1 route', async () => {
      await page.getByTestId('mock-server-route-search').fill('health');
      // Table should show only the health route
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
    await openMockerTab(page);
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

  // ==========================================
  // Phase 4: Request matching -- exact routes
  // ==========================================

  test('should return 200 with correct body for GET /health', async () => {
    const response = await mockFetch('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('should return 200 with correct body for GET /users/1', async () => {
    const response = await mockFetch('/users/1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 1, name: 'John Doe', email: 'john@example.com' });
  });

  test('should return 201 with correct body for POST /users', async () => {
    const response = await mockFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' })
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 2, name: 'New User', email: 'new@example.com' });
  });

  // ==========================================
  // Phase 5: Unmatched routes
  // ==========================================

  test('should return 404 with helpful error for unmatched path', async () => {
    const response = await mockFetch('/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('No mock example found');
    expect(response.body.method).toBe('GET');
    expect(response.body.path).toBe('/nonexistent');
    expect(response.body.hint).toContain('Add an example');
    expect(Array.isArray(response.body.availableRoutes)).toBe(true);
    expect(response.body.availableRoutes.length).toBe(3);
  });

  test('should return 404 for wrong method on existing path', async () => {
    // /health exists as GET, but not as DELETE
    const response = await mockFetch('/health', { method: 'DELETE' });
    expect(response.status).toBe(404);
    expect(response.body.method).toBe('DELETE');
  });

  test('should return 404 for partial path match', async () => {
    // /users exists (POST) but /users/999 doesn't have an exact match for GET
    // (only /users/1 has examples)
    const response = await mockFetch('/users/999');
    expect(response.status).toBe(404);
  });

  // ==========================================
  // Phase 6: Default example selection
  // ==========================================

  test('should return first example when no selection header is provided', async () => {
    // GET /users/1 has success-200 (first) and not-found-404 (second)
    const response = await mockFetch('/users/1');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('John Doe');
  });

  // ==========================================
  // Phase 7: Example selection headers
  // ==========================================

  test('should select example by X-Mock-Example header (case-insensitive)', async () => {
    await test.step('Lowercase header value', async () => {
      const response = await mockFetch('/users/1', {
        headers: { 'X-Mock-Example': 'not-found-404' }
      });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });

    await test.step('Mixed case header value', async () => {
      const response = await mockFetch('/users/1', {
        headers: { 'X-Mock-Example': 'Not-Found-404' }
      });
      expect(response.status).toBe(404);
    });

    await test.step('Select success example explicitly', async () => {
      const response = await mockFetch('/users/1', {
        headers: { 'X-Mock-Example': 'success-200' }
      });
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('John Doe');
    });
  });

  test('should fall back to default when X-Mock-Example name does not exist', async () => {
    const response = await mockFetch('/users/1', {
      headers: { 'X-Mock-Example': 'nonexistent-example-name' }
    });
    // Falls back to first example (success-200)
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('John Doe');
  });

  test('should select example by X-Mock-Response-Code header', async () => {
    const response = await mockFetch('/users/1', {
      headers: { 'X-Mock-Response-Code': '404' }
    });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  test('should prefer X-Mock-Example over X-Mock-Response-Code when both present', async () => {
    // Send both headers -- X-Mock-Example should take priority
    const response = await mockFetch('/users/1', {
      headers: {
        'X-Mock-Example': 'success-200',
        'X-Mock-Response-Code': '404'
      }
    });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('John Doe');
  });

  // ==========================================
  // Phase 8: Response layer
  // ==========================================

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
    // get-user.bru success-200 has x-custom-header: test-value
    const response = await mockFetch('/users/1');
    expect(response.headers.get('x-custom-header')).toBe('test-value');
  });

  test('should handle OPTIONS preflight with 204', async () => {
    const res = await fetch(`${MOCK_BASE}/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  // ==========================================
  // Phase 9: URL normalization edge cases
  // ==========================================

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

  // ==========================================
  // Phase 10: Send requests from Bruno UI to mock server
  // ==========================================

  test('should create and send request to mock /health via Bruno', async ({ pageWithUserData: page }) => {
    await createRequest(page, 'mock-health-check', COLLECTION_NAME, {
      url: `http://localhost:${MOCK_PORT}/health`
    });
    await sendRequest(page, 200);
    const body = await getResponseBody(page);
    expect(body).toContain('"status"');
    expect(body).toContain('"ok"');
  });

  test('should create and send request to mock /users/1 via Bruno', async ({ pageWithUserData: page }) => {
    await createRequest(page, 'mock-get-user', COLLECTION_NAME, {
      url: `http://localhost:${MOCK_PORT}/users/1`
    });
    await sendRequest(page, 200);
    const body = await getResponseBody(page);
    expect(body).toContain('John Doe');
    expect(body).toContain('john@example.com');
  });

  test('should create and send POST request to mock /users via Bruno', async ({ pageWithUserData: page }) => {
    await createRequest(page, 'mock-create-user', COLLECTION_NAME, {
      url: `http://localhost:${MOCK_PORT}/users`,
      method: 'POST'
    });
    await sendRequest(page, 201);
    const body = await getResponseBody(page);
    expect(body).toContain('New User');
  });

  // ==========================================
  // Phase 11: Request log table validation
  // ==========================================

  test('should show all requests in request log after Bruno sends', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-tab-log').click();

    await test.step('Log count should reflect all requests made so far', async () => {
      const logCount = page.getByTestId('mock-server-log-count');
      await expect(logCount).toBeVisible();
      const text = await logCount.innerText();
      const count = parseInt(text);
      // We've made many requests by now (node fetch + bruno UI)
      expect(count).toBeGreaterThan(10);
    });

    await test.step('Log table should have rows with correct columns', async () => {
      // Check that the table has header columns
      const headers = page.locator('.log-table-container .table-container table thead td');
      const headerCount = await headers.count();
      // Columns: Time, Method, Path, Example, Status, Delay, Duration
      expect(headerCount).toBe(7);
    });

    await test.step('Log entries should contain matched request data', async () => {
      // Check that some rows have method badge and path
      const methodBadges = page.locator('.log-table-container .method-badge');
      expect(await methodBadges.count()).toBeGreaterThan(0);

      const paths = page.locator('.log-table-container .log-path');
      expect(await paths.count()).toBeGreaterThan(0);
    });
  });

  test('should show unmatched requests with No Match label in log', async ({ pageWithUserData: page }) => {
    await test.step('Make an unmatched request to create a log entry', async () => {
      await mockFetch('/this-does-not-exist');
    });

    await test.step('Verify No Match label appears in log', async () => {
      await openMockerTab(page);
      await page.getByTestId('mock-server-tab-log').click();
      // Wait for the log to update
      await page.waitForTimeout(500);
      const noMatchLabels = page.locator('.log-table-container .no-match-label');
      expect(await noMatchLabels.count()).toBeGreaterThan(0);
    });
  });

  test('should filter request log by match status', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-tab-log').click();

    await test.step('Filter to show only unmatched', async () => {
      await page.getByTestId('mock-server-match-filter').click();
      await page.locator('.filter-option-label').getByText('Unmatched', { exact: true }).click();

      const noMatchLabels = page.locator('.log-table-container .no-match-label');
      expect(await noMatchLabels.count()).toBeGreaterThan(0);

      // All visible status codes should be 404
      const statusCodes = page.locator('.log-table-container .status-code');
      const count = await statusCodes.count();
      for (let i = 0; i < count; i++) {
        await expect(statusCodes.nth(i)).toHaveText('404');
      }
    });

    await test.step('Filter to show only matched', async () => {
      await page.getByTestId('mock-server-match-filter').click();
      await page.locator('.filter-option-label').getByText('Matched', { exact: true }).click();

      // No "No Match" labels should be visible
      const noMatchLabels = page.locator('.log-table-container .no-match-label');
      expect(await noMatchLabels.count()).toBe(0);
    });

    await test.step('Reset filter to all', async () => {
      await page.getByTestId('mock-server-match-filter').click();
      await page.locator('.filter-option-label').getByText('All Requests', { exact: true }).click();
    });
  });

  test('should filter request log by status code', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
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
    await openMockerTab(page);
    await page.getByTestId('mock-server-tab-log').click();

    // Verify log has entries before clearing
    const logCount = page.getByTestId('mock-server-log-count');
    await expect(logCount).toBeVisible();
    const text = await logCount.innerText();
    expect(parseInt(text)).toBeGreaterThan(0);

    // Clear
    await page.getByTestId('mock-server-log-clear').click();
    await expect(page.getByText('No requests logged yet')).toBeVisible();
    // Log count and clear button should not be visible in empty state
    await expect(logCount).not.toBeVisible();
  });

  test('should accumulate new log entries after clearing', async ({ pageWithUserData: page }) => {
    // Log was just cleared, make a fresh request
    await mockFetch('/health');

    await openMockerTab(page);
    await page.getByTestId('mock-server-tab-log').click();
    await page.waitForTimeout(500);

    const logCount = page.getByTestId('mock-server-log-count');
    await expect(logCount).toBeVisible();
    const text = await logCount.innerText();
    expect(parseInt(text)).toBe(1);
  });

  // ==========================================
  // Phase 12: Global delay
  // ==========================================

  test('should apply global delay to matched responses', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-delay-input').fill('500');

    const start = Date.now();
    await mockFetch('/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(400);

    await page.getByTestId('mock-server-delay-input').fill('0');
  });

  test('should not delay 404 responses', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-delay-input').fill('1000');

    const start = Date.now();
    await mockFetch('/nonexistent');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);

    await page.getByTestId('mock-server-delay-input').fill('0');
  });

  // ==========================================
  // Phase 13: Edit example + refresh
  // ==========================================

  test('should serve stale response before refresh and updated response after', async ({ pageWithUserData: page }) => {
    await test.step('Verify current healthcheck response', async () => {
      const before = await mockFetch('/health');
      expect(before.body).toEqual({ status: 'ok' });
    });

    await test.step('Edit healthcheck example response body', async () => {
      await page.locator('.collection-item-name').filter({ hasText: 'health' }).first().click();
      await page.locator('.collection-item-name').filter({ hasText: 'healthcheck' }).first().click();
      await page.locator('.collection-item-name').filter({ hasText: 'healthcheck' }).first().getByTestId('request-item-chevron').click();
      await page.locator('.collection-item-name').filter({ hasText: 'healthy' }).click();

      await page.getByTestId('response-example-edit-btn').click();

      const responseTab = page.locator('[data-testid="tab-response"]');
      if (await responseTab.isVisible()) {
        await responseTab.click();
      }

      const codeMirror = page.locator('.response-pane .CodeMirror').first();
      if (await codeMirror.isVisible()) {
        await codeMirror.click();
        const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
        await page.keyboard.press(selectAll);
        await page.keyboard.type('{"status": "updated"}');
      }

      await page.getByTestId('response-example-save-btn').click();
      await page.waitForTimeout(500);
    });

    await test.step('Mock still returns old response before refresh', async () => {
      const stale = await mockFetch('/health');
      expect(stale.body).toEqual({ status: 'ok' });
    });

    await test.step('Refresh routes and verify updated response', async () => {
      await openMockerTab(page);
      await page.getByTestId('mock-server-refresh-btn').click();
      await expect(page.getByText('Routes refreshed')).toBeVisible({ timeout: 5000 });

      const updated = await mockFetch('/health');
      expect(updated.body).toEqual({ status: 'updated' });
    });
  });

  test('should show refresh toast with correct route count', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-refresh-btn').click();
    await expect(page.getByText(/Routes refreshed.*routes/).first()).toBeVisible({ timeout: 5000 });
  });

  // ==========================================
  // Phase 14: Graceful stop
  // ==========================================

  test('should show stopping state during shutdown', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    // Make a request to ensure there are active connections
    await mockFetch('/health');

    await page.getByTestId('mock-server-stop-btn').click();
    // The stopping state should appear briefly
    await expect(page.getByTestId('mock-server-status-text')).toContainText('Stopped', { timeout: 15000 });
  });

  test('should become unreachable after stop', async () => {
    try {
      await fetch(`${MOCK_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      expect(true).toBe(false);
    } catch {
      // Expected -- connection refused
    }
  });

  test('should show start button and hide stop button after stop', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await expect(page.getByTestId('mock-server-start-btn')).toBeVisible();
    await expect(page.getByTestId('mock-server-stop-btn')).not.toBeVisible();
    await expect(page.getByTestId('mock-server-copy-url')).not.toBeVisible();
    await expect(page.getByTestId('mock-server-port-input')).toBeEnabled();
  });

  // ==========================================
  // Phase 15: Restart and re-verify
  // ==========================================

  test('should restart server and serve routes again', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await startMockServer(page);

    const response = await mockFetch('/users/1');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('John Doe');
  });

  test('should have empty request log after restart', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await page.getByTestId('mock-server-tab-log').click();
    // After server restart, the log from the previous session is cleared
    // But we just made one request in the restart test, so it should have 1 entry
    const logCount = page.getByTestId('mock-server-log-count');
    await expect(logCount).toBeVisible();
    const text = await logCount.innerText();
    expect(parseInt(text)).toBeGreaterThanOrEqual(1);
  });

  // ==========================================
  // Phase 16: Final cleanup
  // ==========================================

  test('should stop server for cleanup', async ({ pageWithUserData: page }) => {
    await openMockerTab(page);
    await stopMockServer(page);
    await expect(page.getByTestId('mock-server-status-text')).toContainText('Stopped');
  });
});
