import {
  test,
  expect,
  Page,
  Locator
} from '../../playwright';
import { escapeRegExp } from '../../support/helpers';

/**
 * Locators for pane tabs: responsive tabs, the overflow menu, and settings tabs.
 */
export const buildPaneTabsLocators = (page: Page) => ({
  responsiveTab: (key: string) => page.getByTestId(`responsive-tab-${key}`),
  // request and response may have more tabs, pass the pane to isolate further.
  overflowTrigger: (root?: Locator) => (root ?? page).locator('.tabs .more-tabs'),
  // menu is rendered via portal, hence it rooted to page.
  overflowItem: (key: string) => page.getByTestId(`menu-dropdown-${key}`),
  scriptSubTabsOverflowTrigger: () => page.getByTestId('script-sub-tabs').getByTestId('tabs-overflow-trigger'),
  collectionSettingsTab: (key: string) => page.getByTestId(`collection-settings-tab-${key}`),
  folderSettingsTab: (key: string) => page.getByTestId(`folder-settings-tab-${key}`),
  folderScriptTab: (key: 'pre-request' | 'post-response') => page.getByTestId(`tab-trigger-${key}`),
  tabTrigger: (key: string) => page.getByTestId(`tab-trigger-${key}`),
  collectionSettingsContent: () => page.locator('.collection-settings-content'),
  requestsNotLoadedTable: () => page.getByTestId('requests-not-loaded'),
  overviewInvalidFilesCount: () => page.getByTestId('info-invalid-files-count'),
  folderSettingsContent: () => page.locator('.folder-settings-content')
});

/**
 * Select a tab in a request or response pane, including tabs hidden in the overflow menu.
 */

const trySelectPaneTabOnce = async (page: Page, paneSelector: string, tabName: string) => {
  const pane = page.locator(paneSelector);
  const visibleTab = pane.locator('.tabs').getByRole('tab', { name: tabName });

  if (await visibleTab.isVisible().catch(() => false)) {
    try {
      await visibleTab.click({ timeout: 2000 });
      await expect(visibleTab).toContainClass('active', { timeout: 500 });
      return true;
    } catch {
      return false;
    }
  }

  const overflowButton = pane.locator('.tabs .more-tabs');
  if (!(await overflowButton.isVisible().catch(() => false))) {
    return false;
  }

  try {
    await overflowButton.click({ force: true, timeout: 1000 });
  } catch {
    return false;
  }

  const dropdownItem = page
    .getByRole('menuitem', { name: new RegExp(escapeRegExp(tabName), 'i') })
    .first();

  if (await dropdownItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    try {
      await dropdownItem.click({ force: true, timeout: 2000 });
      await expect(visibleTab).toContainClass('active', { timeout: 500 });
      return true;
    } catch {
      return false;
    }
  }

  const fallbackDropdownItem = page.locator('.tippy-box .dropdown-item').filter({ hasText: tabName }).first();
  if (await fallbackDropdownItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    try {
      await fallbackDropdownItem.click({ force: true, timeout: 2000 });
      await expect(visibleTab).toContainClass('active', { timeout: 500 });
      return true;
    } catch {
      return false;
    }
  }

  return false;
};

export const selectPaneTab = async (page: Page, paneSelector: string, tabName: string) => {
  await test.step(`Select tab "${tabName}" in ${paneSelector}`, async () => {
    const pane = page.locator(paneSelector);
    await expect(pane).toBeVisible();
    await expect(pane.locator('.tabs')).toBeVisible();

    // await expect
    //   .poll(
    //     async () => trySelectPaneTabOnce(page, paneSelector, tabName),
    //     {
    //       message: `Tab "${tabName}" not found in visible tabs or overflow dropdown`,
    //       timeout: 8000,
    //       intervals: [100, 150, 200, 250]
    //     }
    //   )
    //   .toBe(true);

    const visibleTab = pane.locator('.tabs').getByRole('tab', { name: tabName });
    const overflowButton = pane.getByTestId('responsive-tabs-more');

    // ResponsiveTabs recalculates layout via ResizeObserver/rAF, so the tab or
    // the overflow trigger can detach mid-click. Retry the whole sequence so a
    // mid-action remount doesn't fail the test.
    await expect(async () => {
      if (await visibleTab.isVisible()) {
        await visibleTab.click({ timeout: 2000 });
        await expect(visibleTab).toContainClass('active', { timeout: 2000 });
        return;
      }

      if (await overflowButton.isVisible()) {
        await overflowButton.click({ timeout: 2000 });

        const dropdownItem = page.locator('.tippy-box .dropdown-item').filter({ hasText: tabName });
        await dropdownItem.waitFor({ state: 'visible', timeout: 2000 });
        await dropdownItem.click({ force: true, timeout: 2000 });
        await expect(visibleTab).toContainClass('active', { timeout: 2000 });
        return;
      }

      throw new Error(`Tab "${tabName}" not found in visible tabs or overflow dropdown`);
    }).toPass({ timeout: 15000 });
  });
};
