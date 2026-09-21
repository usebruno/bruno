import { Locator, Page, expect, test } from '../../../playwright';
import { buildCommonLocators, buildSandboxLocators } from './locators';
import { revealFolderRow } from './sidebar';

/**
 * Builds locators for the runner results view
 * @param page - The Playwright page object
 * @returns Object with locators for runner elements
 */
export const buildRunnerLocators = (page: Page) => ({
  allCount: () => page.getByTestId('runner-filter-all-count'),
  passedCount: () => page.getByTestId('runner-filter-passed-count'),
  failedCount: () => page.getByTestId('runner-filter-failed-count'),
  skippedCount: () => page.getByTestId('runner-filter-skipped-count'),
  resetButton: () => page.getByRole('button', { name: 'Reset' }),
  runCollectionButton: () => page.getByTestId('runner-run-button'),
  runAgainButton: () => page.getByRole('button', { name: 'Run Again' }),
  cancelExecutionButton: () => page.getByTestId('runner-cancel-button'),
  configPanel: () => page.getByTestId('runner-config-panel'),
  configCounter: () => page.getByTestId('runner-config-counter'),
  selectAllButton: () => page.getByTestId('runner-select-all'),
  configResetButton: () => page.getByTestId('runner-config-reset'),
  requestItems: () => page.getByTestId('runner-request-item'),
  delayInput: () => page.getByTestId('runner-delay-input'),
  resultItems: () => page.getByTestId('runner-result-item'),
  passedTestRows: () => page.getByTestId('runner-test-row-passed'),
  failedTestRows: () => page.getByTestId('runner-test-row-failed'),
  requestLoader: () => page.getByTestId('runner-result-item').locator('.animate-spin'),
  requestStatusLabel: () => page.getByTestId('runner-iteration-status-label'),
  resultTimelineEntries: () => page.getByTestId('timeline-entry')
});

/**
 * Builds locators for the include/exclude tag filters shared by the runner tab and the sidebar
 * "Run" modal. Both render the same pair of columns, so `root` picks which copy to address when
 * the modal overlays the runner tab.
 * @param page - The Playwright page object
 * @param root - The container holding the filters (the page, or the modal when it is open)
 * @returns Object with locators for the tag filter elements
 */
export const buildRunnerTagLocators = (page: Page, root?: Locator) => {
  const scope = root ?? page.locator('body');
  const column = (kind: RunnerTagKind) => scope.getByTestId(RUNNER_TAG_COLUMN_TEST_IDS[kind]);

  return {
    column,
    input: (kind: RunnerTagKind) => column(kind).getByTestId('tag-input').getByRole('textbox'),
    chip: (kind: RunnerTagKind, tagName: string) => column(kind).locator('.tag-item', { hasText: tagName })
  };
};

export type RunnerTagKind = 'Include' | 'Exclude';

const RUNNER_TAG_COLUMN_TEST_IDS: Record<RunnerTagKind, string> = {
  Include: 'runner-include-tags',
  Exclude: 'runner-exclude-tags'
};

/**
 * Adds a tag to the runner's include or exclude filter and waits for the chip to appear.
 * @param page - The Playwright page object
 * @param kind - Which filter to add the tag to
 * @param tagName - The tag to filter by
 * @param root - The container holding the filters (the modal, when run from one)
 * @returns void
 */
export const addRunnerTag = async (page: Page, kind: RunnerTagKind, tagName: string, root?: Locator) => {
  await test.step(`Add "${tagName}" to the runner's ${kind.toLowerCase()} tags`, async () => {
    const locators = buildRunnerTagLocators(page, root);
    const input = locators.input(kind);
    await expect(input).toBeVisible();
    await input.fill(tagName);
    await input.press('Enter');
    await expect(locators.chip(kind, tagName)).toBeVisible();
  });
};

/**
 * Removes every tag from both runner filters. The filters live in collection state, so they
 * survive across tests that share an app instance — each test starts from a clean filter.
 * @param page - The Playwright page object
 * @param root - The container holding the filters (the modal, when run from one)
 * @returns void
 */
export const clearRunnerTags = async (page: Page, root?: Locator) => {
  await test.step('Clear the runner tag filters', async () => {
    const locators = buildRunnerTagLocators(page, root);
    for (const kind of ['Include', 'Exclude'] as RunnerTagKind[]) {
      const removers = locators.column(kind).locator('.tag-item .tag-remove');
      // Removing a chip re-renders the list, so re-read it rather than iterating a stale handle.
      for (let remaining = await removers.count(); remaining > 0; remaining--) {
        await removers.first().click();
      }
      await expect(removers).toHaveCount(0);
    }
  });
};

/**
 * Locates a row in the runner's "Configure requests to run" list by its exact request name.
 * @param page - The Playwright page object
 * @param requestName - The request's name as shown in the row
 * @returns The row locator
 */
export const runnerConfigItem = (page: Page, requestName: string): Locator =>
  page.getByTestId('runner-request-item').filter({ has: page.getByText(requestName, { exact: true }) });

/**
 * Reads test result counts from the filter buttons in the runner results view
 * @param page - The Playwright page object
 * @returns An object with totalRequests, passed, failed, and skipped counts
 */
export const getRunnerResultCounts = async (page: Page) => {
  const locators = buildRunnerLocators(page);

  const totalRequests = parseInt(await locators.allCount().innerText());
  const passed = parseInt(await locators.passedCount().innerText());
  const failed = parseInt(await locators.failedCount().innerText());
  const skipped = parseInt(await locators.skippedCount().innerText());

  return { totalRequests, passed, failed, skipped };
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
 * Expands a collection in the sidebar so its items are mounted, then opens its runner tab.
 *
 * RunnerTags builds the tag vocabulary it validates against (`collection.allTags`) in a mount
 * effect keyed only on the collection uid. A collection whose items are still loading therefore
 * yields an empty vocabulary that never refreshes, and every tag typed into the include/exclude
 * filters is rejected as "tag does not exist!". Expanding first — what a user does anyway —
 * guarantees the items are there before the effect runs.
 * @param page - The Playwright page object
 * @param collectionName - The collection to open the runner for
 * @param anyItemName - Any item in the collection, awaited as proof that mounting finished
 * @returns void
 */
export const openRunnerTabWithTagsReady = async (page: Page, collectionName: string, anyItemName: string) => {
  await test.step(`Mount "${collectionName}" and open its runner tab`, async () => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collection(collectionName).click();
    await expect(locators.sidebar.itemsIn(collectionName, anyItemName)).toBeVisible();
    await openRunnerTab(page, collectionName);
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

export const openRunnerResultTimeline = async (page: Page, requestName: string) => {
  await test.step(`Open the "${requestName}" runner result on its Timeline tab`, async () => {
    const locators = buildRunnerLocators(page);
    const result = locators.resultItems().filter({ hasText: requestName });
    await result.first().waitFor({ state: 'visible', timeout: 10000 });
    await result.locator('.link').first().click();

    const timelineTab = page.locator('[role="tab"]').filter({ hasText: 'Timeline' }).last();
    await timelineTab.click();

    const { timeline } = buildCommonLocators(page);
    const entry = locators.resultTimelineEntries().first();
    await entry.waitFor({ state: 'visible', timeout: 10000 });
    await timeline.itemHeader(entry).click();
  });
};

/**
 * Opens a folder's run modal without starting a run: walks the sidebar to the folder, expanding
 * the collection and any parent folders on the way, then picks "Run" from its context menu.
 * The modal reports how many requests each run mode would cover, so a spec can assert the effect
 * of the tag filters without executing anything.
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection containing the folder
 * @param folderPath - Array of folder names forming the path (e.g. ['scripting', 'api', 'bru', 'cookies'])
 * @returns The modal locator, to pass to `folderRunButton` / `folderRunCount`
 */
export const openFolderRunModal = async (page: Page, collectionName: string, folderPath: string[]): Promise<Locator> => {
  return await test.step(`Open the run modal for folder "${folderPath.join('/')}" in "${collectionName}"`, async () => {
    const targetRow = await revealFolderRow(page, collectionName, folderPath);

    // The row's menu icon is revealed by CSS :hover.
    await targetRow.hover();
    const menuIcon = targetRow.locator('.menu-icon');
    await menuIcon.waitFor({ state: 'visible', timeout: 5000 });
    await menuIcon.click();

    const runMenuItem = page.locator('.dropdown-item').filter({ hasText: 'Run' });
    await runMenuItem.waitFor({ state: 'visible' });
    await runMenuItem.click();

    const modal = page.locator('.bruno-modal');
    await expect(modal).toBeVisible();
    return modal;
  });
};

/**
 * Locates one of the run buttons in the folder run modal.
 * @param modal - The run modal, as returned by `openFolderRunModal`
 * @param mode - 'Recursive Run' includes subfolders; 'Run' covers only the folder itself
 * @returns The button locator
 */
export const folderRunButton = (modal: Locator, mode: FolderRunMode): Locator =>
  modal.getByRole('button', { name: mode, exact: true });

/**
 * Locates the label above a run button, which reports how many requests that button would run.
 * The count reflects the runner's tag filters, so it is the cheapest way to assert filtering
 * without starting a run.
 * @param modal - The run modal, as returned by `openFolderRunModal`
 * @param mode - Which of the two run modes to read the count for
 * @returns The label locator, whose text reads e.g. "Recursive Run(2 requests)"
 */
export const folderRunCount = (modal: Locator, mode: FolderRunMode): Locator =>
  modal.getByTestId(FOLDER_RUN_COUNT_TEST_IDS[mode]);

export type FolderRunMode = 'Run' | 'Recursive Run';

const FOLDER_RUN_COUNT_TEST_IDS: Record<FolderRunMode, string> = {
  'Run': 'folder-run-count',
  'Recursive Run': 'folder-recursive-run-count'
};

/**
 * Dismisses the folder run modal without running, and does nothing if none is open.
 * @param page - The Playwright page object
 * @returns void
 */
export const dismissFolderRunModal = async (page: Page) => {
  const modal = page.locator('.bruno-modal').first();
  if (!(await modal.isVisible())) {
    return;
  }

  await test.step('Dismiss the folder run modal', async () => {
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal).toBeHidden();
  });
};

/**
 * Runs a specific folder within a collection by navigating to it in the sidebar,
 * opening its context menu, and clicking "Run" followed by "Recursive Run".
 * Waits for the run to finish.
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection containing the folder
 * @param folderPath - Array of folder names forming the path (e.g. ['scripting', 'api', 'bru', 'cookies'])
 * @returns void
 */
export const runFolder = async (page: Page, collectionName: string, folderPath: string[]) => {
  await test.step(`Run folder "${folderPath.join('/')}" in "${collectionName}"`, async () => {
    const modal = await openFolderRunModal(page, collectionName, folderPath);
    await folderRunButton(modal, 'Recursive Run').click();

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
