import { Locator, Page } from '..';

/**
 * Locators for the request tab strip (request, folder and collection settings tabs).
 */
export const buildRequestTabsLocators = (page: Page) => ({
  allRequestTabs: () => page.locator('.request-tab'),
  requestTab: (requestName: string) => page.locator('.request-tab .tab-label').filter({ hasText: requestName }),
  folderTab: (folderName: string) => page.locator('.request-tab .tab-label').filter({ hasText: folderName }),
  collectionSettingsTab: () =>
    page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) }),
  activeRequestTab: () => page.locator('.request-tab.active'),
  leftChevron: () => page.getByLabel('Left Chevron'),
  scrollContainer: () => page.locator('.tabs-scroll-container'),
  activeRequestTabMethod: () => page.locator('.request-tab.active .tab-method'),
  closeTab: (requestName: string) => page.locator('.request-tab').filter({ hasText: requestName }).getByTestId('request-tab-close-icon'),
  closableTabs: () => page.locator('.request-tab').filter({ has: page.getByTestId('request-tab-close-icon') }),
  closeTabIcon: (tab: Locator) => tab.getByTestId('request-tab-close-icon'),
  draftIndicator: () => page.locator('.request-tab.active .has-changes-icon'),
  tabDraftIndicator: (tab: Locator) => tab.locator('.has-changes-icon')
});
