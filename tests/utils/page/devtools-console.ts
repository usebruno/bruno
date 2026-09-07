import { Page, test } from '../../../playwright';
import { escapeRegExp } from '../helpers';
import { readLastHopRequestHeaderLines, readRequestHops } from './network-log';

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

  const reqHeaderLines = async () => {
    const [names, values] = await Promise.all([reqHeaderNames().allTextContents(), reqHeaderValues().allTextContents()]);
    return names.map((name, i) => `${name.trim()}: ${(values[i] ?? '').trim()}`);
  };

  return {
    trigger: () => page.locator('button[data-trigger="dev-tools"]'),
    header: () => page.getByTestId('console-header'),
    networkTab: () => page.getByTestId('network-tab'),
    networkRows: () => page.getByTestId('network-request-row'),
    closeButton: () => page.getByTitle('Close console'),
    detailsPanel: () => page.getByTestId('details-panel'),
    requestDetailsTab: () => page.getByTestId('request-details-tab'),
    networkDetailsTab: () => page.getByTestId('network-details-tab'),
    requestHeadersTable: () => page.getByTestId('request-details-request-headers'),
    requestHeaders: {
      rows: reqHeaderRows,
      row: reqHeaderRow,
      headerLines: reqHeaderLines,
      value: (name: string) => reqHeaderRow(name).getByTestId('request-details-header-value')
    },
    lastHopRequestHeaderLines: () => readLastHopRequestHeaderLines(page.getByTestId('details-panel')),
    requestHops: () => readRequestHops(page.getByTestId('details-panel'))
  };
};

export const openNetworkRequestDetails = async (page: Page) => {
  await test.step('Open DevTools → Network and open the request details', async () => {
    const devtools = buildDevToolsLocators(page);
    await devtools.trigger().click();
    await devtools.header().waitFor({ state: 'visible' });

    await devtools.networkTab().click();
    const row = devtools.networkRows().last();
    await row.waitFor({ state: 'visible' });
    await row.click();

    await devtools.detailsPanel().waitFor({ state: 'visible' });
    /** Already the default sub-tab, clicked so the Request Headers table is guaranteed active. */
    await devtools.requestDetailsTab().click();

    /** The details panel scrolls on its own, so the table can start below the fold. */
    const table = devtools.requestHeadersTable();
    await table.waitFor({ state: 'attached' });
    await table.scrollIntoViewIfNeeded();
  });
};

/** Left open, the streaming network log races collection-dropdown clicks during teardown. */
export const closeDevToolsConsole = async (page: Page) => {
  const closeButton = buildDevToolsLocators(page).closeButton();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await closeButton.waitFor({ state: 'hidden' }).catch(() => {});
  }
};
