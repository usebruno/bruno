import { Page, expect, test } from '../../../playwright';
import { buildSandboxLocators } from './locators';

/**
 * Builds locators for the runner results view
 * @param page - The Playwright page object
 * @returns Object with locators for runner elements
 */
export const buildRunnerLocators = (page: Page) => ({
  allButton: () => page.locator('button').filter({ hasText: /^All/ }),
  passedButton: () => page.locator('button').filter({ hasText: /^Passed/ }),
  failedButton: () => page.locator('button').filter({ hasText: /^Failed/ }),
  skippedButton: () => page.locator('button').filter({ hasText: /^Skipped/ }),
  resetButton: () => page.getByRole('button', { name: 'Reset' }),
  runCollectionButton: () => page.getByRole('button', { name: 'Run Collection' }),
  runAgainButton: () => page.getByRole('button', { name: 'Run Again' })
});

/**
 * Reads test result counts from the filter buttons in the runner results view
 * @param page - The Playwright page object
 * @returns An object with totalRequests, passed, failed, and skipped counts
 */
export const getRunnerResultCounts = async (page: Page) => {
  const locators = buildRunnerLocators(page);

  const totalRequests = parseInt(await locators.allButton().locator('span').innerText());
  const passed = parseInt(await locators.passedButton().locator('span').innerText());
  const failed = parseInt(await locators.failedButton().locator('span').innerText());
  const skipped = parseInt(await locators.skippedButton().locator('span').innerText());

  return { totalRequests, passed, failed, skipped };
};

/**
 * Runs a collection by clicking the Run menu item and handling the runner tab
 * Includes logic to reset existing results if present
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection to run
 * @returns void
 */
export const runCollection = async (page: Page, collectionName: string) => {
  await test.step(`Run collection "${collectionName}"`, async () => {
    // Ensure collection is visible and loaded (scope to sidebar)
    const collectionContainer = page.getByTestId('collections').locator('.collection-name').filter({ hasText: collectionName });
    await collectionContainer.waitFor({ state: 'visible' });

    // Open collection actions menu - hover first to reveal the hidden actions button
    const actionsContainer = collectionContainer.locator('.collection-actions');
    await collectionContainer.hover();
    await actionsContainer.waitFor({ state: 'visible' });

    const icon = actionsContainer.locator('.icon');
    await icon.waitFor({ state: 'visible', timeout: 5000 });
    await icon.click();

    // Click Run menu item
    const runMenuItem = page.getByText('Run', { exact: true });
    await runMenuItem.waitFor({ state: 'visible' });
    await runMenuItem.click();

    // Handle runner tab - reset if needed, then run
    const locators = buildRunnerLocators(page);

    // Check if Reset button is visible (means there are existing results)
    const resetVisible = await locators.resetButton().isVisible({ timeout: 1000 }).catch(() => false);
    if (resetVisible) {
      await locators.resetButton().click();
      // Wait for the Run Collection button to become visible after reset
      await locators.runCollectionButton().waitFor({ state: 'visible', timeout: 5000 });
    }

    // Now wait for and click Run Collection button
    await locators.runCollectionButton().waitFor({ state: 'visible', timeout: 10000 });
    await locators.runCollectionButton().click();

    // Wait for the run to complete
    await locators.runAgainButton().waitFor({ timeout: 2 * 60 * 1000 });
  });
};

/**
 * Runs a specific folder within a collection by navigating to it in the sidebar,
 * opening its context menu, and clicking "Run" followed by "Recursive Run".
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection containing the folder
 * @param folderPath - Array of folder names forming the path (e.g. ['scripting', 'api', 'bru', 'cookies'])
 */
export const runFolder = async (page: Page, collectionName: string, folderPath: string[]) => {
  await test.step(`Run folder "${folderPath.join('/')}" in "${collectionName}"`, async () => {
    // Start scoped to the collection's sidebar container
    const sidebar = page.getByTestId('collections');

    // Walk down the folder path, scoping each step to the previous folder's container.
    // Each CollectionItem renders as a StyledWrapper div containing:
    //   - div.collection-item-name (the row with chevron, name, menu)
    //   - div (children container when expanded)
    // We scope to the parent wrapper so the next folder lookup is unambiguous.
    let scope = sidebar;
    for (const folderName of folderPath) {
      const row = scope.locator('.collection-item-name').filter({ hasText: folderName }).first();
      await row.waitFor({ state: 'visible', timeout: 5000 });

      // Click the chevron to expand (skip if already expanded)
      const chevron = row.getByTestId('folder-chevron');
      const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
      if (!isExpanded) {
        await chevron.click();
      }

      // Scope to this folder's wrapper (parent of the row) for the next iteration
      scope = row.locator('..');
    }

    // The target folder row is the last one we found — hover to reveal menu
    const targetRow = scope.locator('.collection-item-name').filter({ hasText: folderPath[folderPath.length - 1] }).first();
    await targetRow.hover();

    // Click the menu icon
    const menuIcon = targetRow.locator('.menu-icon');
    await menuIcon.waitFor({ state: 'visible', timeout: 5000 });
    await menuIcon.click();

    // Click "Run" in the dropdown
    const runMenuItem = page.locator('.dropdown-item').filter({ hasText: 'Run' });
    await runMenuItem.waitFor({ state: 'visible' });
    await runMenuItem.click();

    // In the RunCollectionItem modal, click "Recursive Run"
    const recursiveRunButton = page.getByRole('button', { name: 'Recursive Run' });
    await recursiveRunButton.waitFor({ state: 'visible', timeout: 5000 });
    await recursiveRunButton.click();

    // Wait for the run to complete
    const runnerLocators = buildRunnerLocators(page);
    await runnerLocators.runAgainButton().waitFor({ timeout: 2 * 60 * 1000 });
  });
};

/**
 * Sets up the JavaScript sandbox mode for a collection
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection (can be title or text)
 * @param mode - 'developer' or 'safe' mode
 * @returns void
 */
export const setSandboxMode = async (page: Page, collectionName: string, mode: 'developer' | 'safe') => {
  await test.step(`Set sandbox mode to "${mode}" for "${collectionName}"`, async () => {
    const sandboxLocators = buildSandboxLocators(page);

    // Click on the collection name in the sidebar
    const sidebarCollection = page.getByTestId('collections').locator('#sidebar-collection-name').filter({ hasText: collectionName }).first();
    await sidebarCollection.waitFor({ state: 'visible' });
    await sidebarCollection.click();

    // Check if there's already a mode selected - if so, we need to click the badge to open settings tab
    const sandboxBadgeVisible = await sandboxLocators.sandboxModeSelector().isVisible().catch(() => false);
    // If a badge exists, click it to open the security settings tab
    if (sandboxBadgeVisible) {
      await sandboxLocators.sandboxModeSelector().click();

      // Wait for the security settings tab to be active
      await sandboxLocators.jsSandboxHeading().waitFor({ state: 'visible', timeout: 10000 });
    }
    // If no badge exists, the modal should have appeared automatically (first time selection)

    // Wait for security settings form to be visible - wait for either radio button
    await Promise.race([
      sandboxLocators.safeModeRadio().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      sandboxLocators.developerModeRadio().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    ]);

    if (mode === 'developer') {
      await sandboxLocators.developerModeRadio().waitFor({ state: 'visible', timeout: 5000 });
      await sandboxLocators.developerModeRadio().click();
    } else {
      await sandboxLocators.safeModeRadio().waitFor({ state: 'visible', timeout: 5000 });
      await sandboxLocators.safeModeRadio().click();
    }

    await page.keyboard.press('Escape');
  });
};

/**
 * Validates runner results against expected counts
 * @param page - The Playwright page object
 * @param expected - Expected counts
 * @returns void
 */
export const validateRunnerResults = async (page: Page,
  expected: {
    totalRequests?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
  }) => {
  const { totalRequests, passed, failed, skipped } = await getRunnerResultCounts(page);

  if (expected.totalRequests !== undefined) {
    await expect(totalRequests).toBe(expected.totalRequests);
  }
  if (expected.passed !== undefined) {
    await expect(passed).toBe(expected.passed);
  }
  if (expected.failed !== undefined) {
    await expect(failed).toBe(expected.failed);
  }
  if (expected.skipped !== undefined) {
    await expect(skipped).toBe(expected.skipped);
  }

  // Validate that passed + failed + skipped = totalRequests
  await expect(passed).toBe(totalRequests - skipped - failed);
};
