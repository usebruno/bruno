import { test, expect, Page, Locator } from '../../playwright';

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

const buildLocators = (page: Page) => ({
  tabs: buildRequestTabsLocators(page)
});

/**
 * Close every open request tab, discarding or saving based on the saveChanges flag.
 *
 * @param page - The page object
 * @returns void
 */
export const closeAllOpenTabs = async (page: Page, saveChanges = false) => {
  await test.step(`Close all tabs, ${saveChanges ? 'saving' : 'discarding'} changes`, async () => {
    const locators = buildLocators(page);
    const closableTabs = locators.tabs.closableTabs();
    const confirmClose = page.locator('.bruno-modal').filter({ hasText: 'Unsaved changes' });
    const resolveButton = saveChanges
      ? confirmClose.getByRole('button', { name: /^Save( All)?$/ })
      : confirmClose.getByRole('button', { name: 'Don\'t Save' });

    const pressCloseAllTabs = async () => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('ControlOrMeta+Shift+W');
    };

    await pressCloseAllTabs();

    await expect(async () => {
      if (await confirmClose.isVisible()) {
        await resolveButton.click();
      }
      await expect(closableTabs).toHaveCount(0, { timeout: 1000 });
    }).toPass({ timeout: 15000 });
  });
};

/**
 * Close all open request tabs using the right-click context menu
 * @param page - The page object
 * @returns void
 */
export const closeAllTabs = async (page: Page) => {
  await test.step('Close all tabs', async () => {
    // Find actual request tabs (those with .tab-method, not Overview/Environments)
    const requestTabLabel = page.locator('.request-tab').filter({ has: page.locator('.tab-method') }).locator('.tab-label').first();
    if (!(await requestTabLabel.isVisible().catch(() => false))) {
      return; // No request tabs to close
    }

    // Right-click on the tab label to open context menu. Aim at its left edge
    // on a short tab name the close-gradient overlay covers the label's centre.
    await requestTabLabel.click({ button: 'right', position: { x: 5, y: 5 } });

    // Wait for the dropdown menu to appear
    const dropdown = page.locator('.tippy-box.dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    // Click "Close All" menu item
    await dropdown.locator('[role="menuitem"][data-item-id="close-all"]').click();

    // Handle "Unsaved Transient Requests" modal if it appears
    const discardAllButton = page.getByRole('button', { name: 'Discard All' });
    if (await discardAllButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardAllButton.click();
    }

    const saveTransientModal = page.getByTestId('save-transient-request-modal');
    if (await saveTransientModal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveTransientModal.getByRole('button', { name: 'Cancel' }).click();
      await expect(saveTransientModal).toBeHidden();
    }
  });
};

// Switch to an already-open request tab by its label (e.g. transient tabs are "Untitled N").
export const switchToOpenTab = async (page: Page, label: string) => {
  await test.step(`Switch to tab "${label}"`, async () => {
    const tab = page.getByTestId('request-tab').filter({ has: page.getByText(label, { exact: true }) });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });
};

export const activeTabIsInStrip = async (page: Page) => {
  const locators = buildLocators(page);
  const strip = await locators.tabs.scrollContainer().boundingBox();
  const tab = await locators.tabs.activeRequestTab().boundingBox();
  if (!strip || !tab) return false;

  return tab.x >= strip.x - 1 && tab.x + tab.width <= strip.x + strip.width + 1;
};
