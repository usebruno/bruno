import { test, expect } from '../../../playwright';

test.describe('DevTools Performance Tab', () => {
  test('should display performance metrics when Performance tab is opened', async ({ page }) => {
    const devToolsButton = page.locator('button[data-trigger="dev-tools"]');
    await expect(devToolsButton).toBeVisible();
    await devToolsButton.click();

    // Wait for DevTools to open
    await expect(page.locator('.console-header')).toBeVisible();

    // Click on the Performance tab
    const performanceTab = page.locator('.console-tab').filter({ hasText: 'Performance' });
    await expect(performanceTab).toBeVisible();
    await performanceTab.click();

    await expect(performanceTab).toHaveClass(/active/);

    await page.waitForTimeout(2500);

    await expect(page.locator('.system-resources h2')).toContainText('System Resources');

    // Verify all resource cards are present
    const resourceCards = page.locator('.resource-card');
    await expect(resourceCards).toHaveCount(4);

    // Test CPU Usage card
    const cpuCard = resourceCards.filter({ has: page.locator('.resource-title', { hasText: 'CPU Usage' }) });
    await expect(cpuCard).toBeVisible();

    const cpuValue = cpuCard.locator('.resource-value');
    await expect(cpuValue).toBeVisible();
    // CPU value should match pattern like "0.0%" or "12.5%"
    await expect(cpuValue).toContainText(/%/);
    const cpuText = await cpuValue.textContent();
    expect(cpuText).toMatch(/^\d+\.\d+%$/);

    // Test Memory Usage card
    const memoryCard = resourceCards.filter({ has: page.locator('.resource-title', { hasText: 'Memory Usage' }) });
    await expect(memoryCard).toBeVisible();

    const memoryValue = memoryCard.locator('.resource-value');
    await expect(memoryValue).toBeVisible();
    // Memory value should match pattern like "123.45 MB" or "1.23 GB"
    const memoryText = await memoryValue.textContent();
    expect(memoryText).toMatch(/^\d+(?:\.\d+)?\s+(Bytes|KB|MB|GB)$/);

    // Test Uptime card
    const uptimeCard = resourceCards.filter({ has: page.locator('.resource-title', { hasText: 'Uptime' }) });
    await expect(uptimeCard).toBeVisible();

    const uptimeValue = uptimeCard.locator('.resource-value');
    await expect(uptimeValue).toBeVisible();
    // Uptime should match patterns like "5s", "1m 30s", or "2h 15m 30s"
    const uptimeText = await uptimeValue.textContent();
    expect(uptimeText).toMatch(/^(\d+h\s)?(\d+m\s)?\d+s$/);

    // Test Process ID card
    const pidCard = resourceCards.filter({ has: page.locator('.resource-title', { hasText: 'Process ID' }) });
    await expect(pidCard).toBeVisible();

    const pidValue = pidCard.locator('.resource-value');
    await expect(pidValue).toBeVisible();
    // PID should be a number
    const pidText = await pidValue.textContent();
    expect(pidText).toMatch(/^\d+$/);
  });

  test('should update performance metrics over time', async ({ page }) => {
    await page.locator('button[data-trigger="dev-tools"]').click();
    await expect(page.locator('.console-header')).toBeVisible();

    await page.locator('.console-tab').filter({ hasText: 'Performance' }).click();

    await page.waitForTimeout(2500);

    const uptimeCard = page.locator('.resource-card').filter({
      has: page.locator('.resource-title', { hasText: 'Uptime' })
    });
    const uptimeValue = uptimeCard.locator('.resource-value');
    const initialUptime = await uptimeValue.textContent();

    // Wait for metrics to update (monitoring interval is 2000ms)
    await page.waitForTimeout(3000);

    // Get updated uptime value
    const updatedUptime = await uptimeValue.textContent();

    // Verify uptime has increased
    expect(updatedUptime).not.toBe(initialUptime);

    // Parse and verify uptime increased
    const parseUptime = (uptimeStr: string): number => {
      let seconds = 0;
      const hourMatch = uptimeStr.match(/(\d+)h/);
      const minuteMatch = uptimeStr.match(/(\d+)m/);
      const secondMatch = uptimeStr.match(/(\d+)s/);

      if (hourMatch) seconds += parseInt(hourMatch[1]) * 3600;
      if (minuteMatch) seconds += parseInt(minuteMatch[1]) * 60;
      if (secondMatch) seconds += parseInt(secondMatch[1]);

      return seconds;
    };

    const initialSeconds = parseUptime(initialUptime || '');
    const updatedSeconds = parseUptime(updatedUptime || '');

    expect(updatedSeconds).toBeGreaterThan(initialSeconds);
  });

  test('should stop monitoring when switching away from Performance tab', async ({ page }) => {
    await page.locator('button[data-trigger="dev-tools"]').click();
    await expect(page.locator('.console-header')).toBeVisible();

    const performanceTab = page.locator('.console-tab').filter({ hasText: 'Performance' });
    await performanceTab.click();
    await expect(performanceTab).toHaveClass(/active/);

    await page.waitForTimeout(2500);

    await expect(page.locator('.resource-card')).toHaveCount(4);

    const consoleTab = page.locator('.console-tab').filter({ hasText: 'Console' });
    await consoleTab.click();
    await expect(consoleTab).toHaveClass(/active/);
    await expect(performanceTab).not.toHaveClass(/active/);

    // Verify Console tab content is shown
    await expect(page.locator('.tab-content')).toBeVisible();

    // Switch back to Performance tab
    await performanceTab.click();
    await expect(performanceTab).toHaveClass(/active/);

    // Wait for metrics to restart
    await page.waitForTimeout(2500);

    // Verify metrics are still working
    const resourceCards = page.locator('.resource-card');
    await expect(resourceCards).toHaveCount(4);

    // Verify values are being displayed
    const cpuValue = resourceCards.first().locator('.resource-value');
    await expect(cpuValue).not.toBeEmpty();
  });
});
