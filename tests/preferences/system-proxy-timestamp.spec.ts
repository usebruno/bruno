import { expect, test } from '../../playwright';
import { buildPreferencesLocators, openSystemProxyPanel } from '../utils/page';

// The System Proxy panel renders a "Last refreshed at <timestamp>" label that is
// produced by the `formatProxyTimestamp` util. The label is created only when the user
// explicitly clicks "Refresh" (a forced refresh), not on the initial auto-fetch.
//
// formatProxyTimestamp uses `toLocaleString('en-GB', { day: '2-digit', month: 'short',
// year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })`, e.g.
//   "15 Jul 2026, 04:30 pm"
const TIMESTAMP_REGEX = /^Last refreshed at \d{2} [A-Z][a-z]{2} \d{4},\s+\d{2}:\d{2}\s?(am|pm)$/i;

test.describe('System Proxy - last refreshed timestamp', () => {
  test('does not show a timestamp before the user forces a refresh', async ({ page }) => {
    await openSystemProxyPanel(page);

    const systemProxyLocators = buildPreferencesLocators(page).systemProxy;

    await expect(systemProxyLocators.systemProxyLastRefreshedLabel()).not.toBeVisible();
  });

  test('shows a correctly formatted timestamp after clicking Refresh', async ({ page }) => {
    await openSystemProxyPanel(page);

    const systemProxyLocators = buildPreferencesLocators(page).systemProxy;
    await systemProxyLocators.systemProxyRefreshButton().click();

    await expect(systemProxyLocators.systemProxyLastRefreshedLabel()).toBeVisible();

    await expect(systemProxyLocators.systemProxyLastRefreshedLabel()).toHaveText(TIMESTAMP_REGEX);
  });

  test('updates the timestamp on a subsequent Refresh', async ({ page }) => {
    await openSystemProxyPanel(page);

    const systemProxyLocators = buildPreferencesLocators(page).systemProxy;

    // first refresh click sets the timestamp
    await systemProxyLocators.systemProxyRefreshButton().click();
    await expect(systemProxyLocators.systemProxyLastRefreshedLabel()).toBeVisible();
    await expect(systemProxyLocators.systemProxyLastRefreshedLabel()).toHaveText(TIMESTAMP_REGEX);

    const firstRefreshedAt = Number(
      await systemProxyLocators.systemProxyLastRefreshedLabel().getAttribute('data-refreshed-at')
    );

    await page.waitForTimeout(2000);

    // second refresh click should update the timestamp
    await systemProxyLocators.systemProxyRefreshButton().click();
    await expect(systemProxyLocators.systemProxyLastRefreshedLabel()).toBeVisible();
    await expect(systemProxyLocators.systemProxyLastRefreshedLabel()).toHaveText(TIMESTAMP_REGEX);

    // The refresh handler sets the timestamp asynchronously (after the dispatched
    // thunk resolves), so the `data-refreshed-at` attribute is not updated the moment
    // the click returns. `toHaveText` above doesn't help here since the regex matches
    // any valid timestamp, including the stale first value. Poll until the attribute
    // actually changes before reading it, otherwise we could capture the old value.
    await expect
      .poll(async () =>
        Number(
          await systemProxyLocators.systemProxyLastRefreshedLabel().getAttribute('data-refreshed-at')
        )
      )
      .not.toBe(firstRefreshedAt);

    const secondRefreshedAt = Number(
      await systemProxyLocators.systemProxyLastRefreshedLabel().getAttribute('data-refreshed-at')
    );

    // the two refreshes should be more than 1 second apart
    expect(secondRefreshedAt - firstRefreshedAt).toBeGreaterThan(1000);
  });
});
