import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe.serial('graphql subscription', () => {
  test('graphql-subscription-request items are visible in the sidebar', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();

    await expect(page.locator('span.item-name').filter({ hasText: 'on-counter' })).toBeVisible();
    await expect(page.locator('span.item-name').filter({ hasText: 'on-countdown' })).toBeVisible();
    await expect(page.locator('span.item-name').filter({ hasText: 'on-failing' })).toBeVisible();
  });

  test('subscribing streams incoming frames, and unsubscribing closes the connection', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('open the request and subscribe', async () => {
      await page.getByTitle(/^on-counter$/).click();
      await locators.graphqlSubscription.connectionControls.subscribe().click();
    });

    await test.step('the Subscribe button flips to Unsubscribe once connected', async () => {
      await expect(locators.graphqlSubscription.connectionControls.unsubscribe()).toBeVisible({ timeout: 5000 });
    });

    await test.step('the simplified message history shows Connected, the subscribe payload, and next payloads — no low-level protocol frames', async () => {
      await expect(locators.graphqlSubscription.infoMessage('Connected')).toBeVisible({ timeout: 5000 });
      await expect(locators.graphqlSubscription.incomingMessages().first()).toBeAttached({ timeout: 5000 });
      await expect
        .poll(async () => locators.graphqlSubscription.messages().count(), { timeout: 5000 })
        .toBeGreaterThanOrEqual(3); // Connected + subscribe payload + at least one `next` payload
      // connection_init/connection_ack are protocol handshake noise, never surfaced
      await expect(locators.graphqlSubscription.messages().filter({ hasText: 'connection_ack' })).toHaveCount(0);
      await expect(locators.graphqlSubscription.messages().filter({ hasText: 'connection_init' })).toHaveCount(0);
    });

    await test.step('unsubscribing closes the connection and reverts the button to Subscribe', async () => {
      await locators.graphqlSubscription.connectionControls.unsubscribe().click();
      await expect(locators.graphqlSubscription.connectionControls.subscribe()).toBeVisible({ timeout: 5000 });
      await expect(locators.graphqlSubscription.infoMessage('Unsubscribed')).toBeVisible({ timeout: 5000 });
      await expect(locators.graphqlSubscription.infoMessages().filter({ hasText: 'Closed' }).last()).toBeVisible({ timeout: 5000 });
    });

    await test.step('resubscribing performs a fresh connection and flips back to Unsubscribe', async () => {
      await locators.graphqlSubscription.connectionControls.subscribe().click();
      await expect(locators.graphqlSubscription.connectionControls.unsubscribe()).toBeVisible({ timeout: 5000 });
    });

    await test.step('unsubscribing again works — the button does not get stuck on Subscribe', async () => {
      await locators.graphqlSubscription.connectionControls.unsubscribe().click();
      await expect(locators.graphqlSubscription.connectionControls.subscribe()).toBeVisible({ timeout: 5000 });
    });
  });

  test('opening multiple messages does not expand unrelated rows (e.g. the Connected info message)', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // The previous test already opened on-counter as a tab (still open, same app
    // instance) — disambiguate from that tab header by clicking the sidebar row.
    await page.locator('span.item-name').filter({ hasText: 'on-counter' }).click();
    await locators.graphqlSubscription.connectionControls.subscribe().click();
    await expect(locators.graphqlSubscription.connectionControls.unsubscribe()).toBeVisible({ timeout: 5000 });

    // Stop the stream as soon as the very first tick arrives — the message list
    // is virtualized (Virtuoso) and auto-scrolls to the newest message, so leaving
    // the subscription running any longer risks the Connected row (the very first
    // entry) scrolling out of the rendered range before the test gets to it.
    await expect
      .poll(async () => locators.graphqlSubscription.incomingMessages().count(), { timeout: 5000 })
      .toBeGreaterThanOrEqual(1);
    await locators.graphqlSubscription.connectionControls.unsubscribe().click();
    await expect(locators.graphqlSubscription.connectionControls.subscribe()).toBeVisible({ timeout: 5000 });

    const connectedRow = locators.graphqlSubscription.infoMessage('Connected');
    await expect(connectedRow).not.toHaveClass(/open/);

    await locators.graphqlSubscription.outgoingMessages().first().click();
    await locators.graphqlSubscription.incomingMessages().first().click();

    await expect(locators.graphqlSubscription.outgoingMessages().first()).toHaveClass(/open/);
    await expect(locators.graphqlSubscription.incomingMessages().first()).toHaveClass(/open/);
    // Rows are keyed/tracked by seq, not by timestamp — an info row that shares a
    // timestamp with a toggled row (or falls in the same recycled Virtuoso slot)
    // must never inherit that row's open state. The two now-expanded rows (each a
    // 300px CodeEditor) can push Connected out of Virtuoso's render window (it's
    // unmounted, not just hidden, so scrollIntoViewIfNeeded on it can't help —
    // scroll the list's own scroller to the top to bring it back into range).
    await page.getByTestId('virtuoso-scroller').evaluate((el) => { el.scrollTop = 0; });
    await expect(connectedRow).not.toHaveClass(/open/);
  });

  test('a finite subscription completes on its own and the button reverts to Subscribe', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await page.getByTitle(/^on-countdown$/).click();
    await locators.graphqlSubscription.connectionControls.subscribe().click();

    await expect(locators.graphqlSubscription.connectionControls.unsubscribe()).toBeVisible({ timeout: 5000 });

    // countdown ticks 3 times (300ms apart) then completes server-side —
    // no user unsubscribe click, the button should still revert on its own.
    await expect(locators.graphqlSubscription.connectionControls.subscribe()).toBeVisible({ timeout: 5000 });
    await expect(locators.graphqlSubscription.infoMessage('Completed')).toBeVisible({ timeout: 5000 });
  });

  test('a mid-stream server error closes the connection and surfaces an error frame', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await page.getByTitle(/^on-failing$/).click();
    await locators.graphqlSubscription.connectionControls.subscribe().click();

    await expect(locators.graphqlSubscription.connectionControls.unsubscribe()).toBeVisible({ timeout: 5000 });

    // The failing subscription throws mid-stream; the reference server closes
    // the socket, so the button reverts to Subscribe without a user click.
    await expect(locators.graphqlSubscription.connectionControls.subscribe()).toBeVisible({ timeout: 5000 });
    await expect(locators.graphqlSubscription.errorMessages().first()).toBeAttached({ timeout: 5000 });
  });
});
