import { Page, expect, test, Locator } from '../../../playwright';
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
  runCollectionButton: () => page.getByTestId('runner-run-button'),
  runAgainButton: () => page.getByRole('button', { name: 'Run Again' }),
  configPanel: () => page.getByTestId('runner-config-panel'),
  configCounter: () => page.getByTestId('runner-config-counter'),
  selectAllButton: () => page.getByTestId('runner-select-all'),
  configResetButton: () => page.getByTestId('runner-config-reset'),
  requestItems: () => page.getByTestId('runner-request-item'),
  delayInput: () => page.getByTestId('runner-delay-input')
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
 * Reads the "N of M selected" indicator from the runner configuration counter
 * @param page - The Playwright page object
 * @returns An object with selected count (N) and enabled (selectable) count (M)
 */
export const getRunnerSelectionCounters = async (page: Page) => {
  const locators = buildRunnerLocators(page);
  const counterText = await locators.configCounter().innerText();

  // Parse "N of M selected" format
  const match = counterText.match(/(\d+)\s+of\s+(\d+)\s+selected/);
  if (!match) {
    throw new Error(`Unable to parse counter text: "${counterText}"`);
  }

  return {
    selected: parseInt(match[1]),
    total: parseInt(match[2])
  };
};

/**
 * Opens the runner tab for a collection without starting a run
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection to open the runner for
 * @returns void
 */
export const openRunnerTab = async (page: Page, collectionName: string) => {
  await test.step(`Open runner tab for "${collectionName}"`, async () => {
    const collectionContainer = page.getByTestId('collections').locator('.collection-name').filter({ hasText: collectionName });
    await collectionContainer.waitFor({ state: 'visible' });

    // Re-hover on each poll: CSS `:hover` reveals `.collection-actions`, but sidebar
    // re-renders can shift the row out from under a one-shot hover().
    const actionsContainer = collectionContainer.locator('.collection-actions');
    await expect(async () => {
      await collectionContainer.hover();
      await expect(actionsContainer).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    const icon = actionsContainer.locator('.icon');
    await icon.waitFor({ state: 'visible', timeout: 5000 });
    await icon.click();

    const runMenuItem = page.getByText('Run', { exact: true });
    await runMenuItem.waitFor({ state: 'visible' });
    await runMenuItem.click();

    // Wait for the config panel to load
    const locators = buildRunnerLocators(page);
    await locators.configPanel().waitFor({ state: 'visible', timeout: 10000 });
  });
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
    // Re-hover on each poll: CSS `:hover` reveals `.collection-actions`, but sidebar
    // re-renders can shift the row out from under a one-shot hover().
    const actionsContainer = collectionContainer.locator('.collection-actions');
    await expect(async () => {
      await collectionContainer.hover();
      await expect(actionsContainer).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

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
 * Navigates to a folder in the sidebar and clicks "Run" from its context menu
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection containing the folder
 * @param folderPath - Array of folder names forming the path, (e.g. ['scripting', 'api', 'bru', 'cookies'])
 */
const openFolderRunMenu = async (page: Page, collectionName: string, folderPath: string[]) => {
  // Scope to the specific collection by its DOM id (collection-<name-kebab>)
  const collectionId = `collection-${collectionName.replace(/\s+/g, '-').toLowerCase()}`;
  const collectionContainer = page.locator(`#${collectionId}`);
  await collectionContainer.waitFor({ state: 'visible', timeout: 5000 });

  // Escape regex metacharacters so folder names are treated as plain text in exact-match patterns.
  const REGEXP_SPECIAL_CHARACTERS = /[\\^$.*+?()[\]{}|]/g;
  const escapeRegExp = (value: string) => value.replace(REGEXP_SPECIAL_CHARACTERS, '\\$&');

  // Top-level collection items are rendered in the collection content container.
  let scope = collectionContainer.locator(':scope > div').last().locator(':scope > div').first();
  await scope.waitFor({ state: 'visible', timeout: 5000 });

  // Walk down one hierarchy level at a time using only immediate child rows.
  let targetRow: Locator;
  for (const folderName of folderPath) {
    const levelRows = scope.locator(':scope > div > .collection-item-name');
    const row = levelRows
      .filter({ has: page.locator('.item-name', { hasText: new RegExp(`^${escapeRegExp(folderName)}$`) }) })
      .first();
    await row.waitFor({ state: 'visible', timeout: 5000 });
    targetRow = row;

    // Click the chevron to expand (skip if already expanded)
    const chevron = row.getByTestId('folder-chevron');
    const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
    if (!isExpanded) {
      await chevron.click();
    }

    // Scope to the next-level children container for this folder.
    const folderWrapper = row.locator('..');
    scope = folderWrapper.locator(':scope > div').last();
  }

  // The target folder row is the last exact row matched in the loop.
  if (!targetRow) {
    throw new Error('Folder path is empty; cannot open folder run menu');
  }
  await targetRow.hover();

  // Click the menu icon
  const menuIcon = targetRow.locator('.menu-icon');
  await menuIcon.waitFor({ state: 'visible', timeout: 5000 });
  await menuIcon.click();

  // Click "Run" in the dropdown
  const runMenuItem = page.locator('.dropdown-item').filter({ hasText: 'Run' });
  await runMenuItem.waitFor({ state: 'visible' });
  await runMenuItem.click();
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
    await openFolderRunMenu(page, collectionName, folderPath);

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

/**
 * Opens the folder run modal without executing a run
 * Navigates to a folder in the sidebar and clicks "Run" from its context menu
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection containing the folder
 * @param folderPath - Array of folder names forming the path
 */
export const openFolderRunModal = async (page: Page, collectionName: string, folderPath: string[]) => {
  await test.step(`Open folder run modal for "${folderPath.join('/')}"`, async () => {
    await openFolderRunMenu(page, collectionName, folderPath);

    // Wait for modal to appear
    const modal = page.locator('.bruno-modal-card').filter({ hasText: /Collection Runner/i });
    await modal.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for request items to load
    await expect.poll(
      async () => {
        const items = await page.locator('[data-testid="runner-request-item"]').count();
        return items > 0;
      },
      { timeout: 10000 }
    ).toBeTruthy();
  });
};

/**
 * Gets all request item locators visible in the folder run modal
 * @param page - The Playwright page object
 * @returns Locator for all request items
 */
export const getRequestItemsInFolderModal = (page: Page) => {
  return page.locator('[data-testid="runner-request-item"]');
};

/**
 * Clicks the "Run X Request(s)" button to execute selected requests in folder modal
 * @param page - The Playwright page object
 */
export const runSelectedRequestsInFolder = async (page: Page) => {
  await test.step('Run selected requests from folder modal', async () => {
    const runButton = page.locator('button').filter({ hasText: /Run \d+ Request/ }).first();
    await runButton.waitFor({ state: 'visible', timeout: 5000 });
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Wait for the runner results to display
    const runnerLocators = buildRunnerLocators(page);
    await runnerLocators.runAgainButton().waitFor({ timeout: 2 * 60 * 1000 });
  });
};
