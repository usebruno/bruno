import { Page, test } from '../../../playwright';
import { escapeRegExp } from '../helpers';
import { readLastHopRequestHeaderLines } from './network-log';

export const buildDevToolsLocators = (page: Page) => {
  const reqHeaderRows = () =>
    page.getByTestId('request-details-request-headers').getByTestId('request-details-header-row');
  const reqHeaderRow = (name: string) =>
    reqHeaderRows().filter({
      has: page.getByTestId('request-details-header-name').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`, 'i') })
    });
  const reqHeaderNames = () =>
    page.getByTestId('request-details-request-headers').getByTestId('request-details-header-name');
  const reqHeaderValues = () =>
    page.getByTestId('request-details-request-headers').getByTestId('request-details-header-value');

  /** Every row as a "name: value" line in render order, matching how the network log prints them. */
  const reqHeaderLines = async () => {
    const [names, values] = await Promise.all([reqHeaderNames().allTextContents(), reqHeaderValues().allTextContents()]);
    return names.map((name, i) => `${name.trim()}: ${(values[i] ?? '').trim()}`);
  };

  return {
    trigger: () => page.locator('button[data-trigger="dev-tools"]'),
    header: () => page.getByTestId('console-header'),
    // Per-tab test ids: console tabs are `<id>-tab`, details-panel sub-tabs are `<id>-details-panel`.
    tab: (id: string) => page.getByTestId(`${id}-tab`),
    networkRows: () => page.getByTestId('network-request-row'),
    closeButton: () => page.getByTitle('Close console'),
    detailsPanel: () => page.getByTestId('details-panel'),
    detailsSubTab: (id: string) => page.getByTestId(`${id}-details-panel`),
    requestHeadersTable: () => page.getByTestId('request-details-request-headers'),
    requestHeaders: {
      rows: reqHeaderRows,
      row: reqHeaderRow,
      headerLines: reqHeaderLines,
      value: (name: string) => reqHeaderRow(name).getByTestId('request-details-header-value')
    },
    // The details panel's Network sub-tab: the same wire trace the response-pane Timeline shows.
    lastHopRequestHeaderLines: () => readLastHopRequestHeaderLines(page.getByTestId('details-panel'))
  };
};

/**
 * Open the DevTools Network tab, select the most-recent request, and land on the details
 * panel's Request tab (its Request Headers table ready to assert).
 */
export const openNetworkRequestDetails = async (page: Page) => {
  await test.step('Open DevTools → Network and open the request details', async () => {
    const devtools = buildDevToolsLocators(page);
    await devtools.trigger().click();
    await devtools.header().waitFor({ state: 'visible' });

    await devtools.tab('network').click();
    const row = devtools.networkRows().last();
    await row.waitFor({ state: 'visible' });
    await row.click();

    await devtools.detailsPanel().waitFor({ state: 'visible' });
    // Request is the default sub-tab, but click it so the Request Headers table is guaranteed active.
    await devtools.detailsSubTab('request').click();
    // The console occupies the lower half of the app and the details panel scrolls independently, so
    // the Request Headers table can start below the fold — scroll it into view before asserting.
    const table = devtools.requestHeadersTable();
    await table.waitFor({ state: 'attached' });
    await table.scrollIntoViewIfNeeded();
  });
};

/**
 * Close the DevTools console if it's open (best-effort). Left-open console panels stream/re-render
 * network logs, which can race collection-dropdown interactions during teardown — close it first.
 */
export const closeDevToolsConsole = async (page: Page) => {
  const closeButton = buildDevToolsLocators(page).closeButton();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await closeButton.waitFor({ state: 'hidden' }).catch(() => {});
  }
};
