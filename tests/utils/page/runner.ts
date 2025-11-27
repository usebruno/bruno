import { Page, expect } from '../../../playwright';

/**
 * Reads test result counts from the filter buttons in the runner results view
 * @param page - The Playwright page object
 * @returns An object with totalRequests, passed, failed, and skipped counts
 */
export const getRunnerResultCounts = async (page: Page) => {
  const allButton = page.locator('button').filter({ hasText: /^All/ });
  const passedButton = page.locator('button').filter({ hasText: /^Passed/ });
  const failedButton = page.locator('button').filter({ hasText: /^Failed/ });
  const skippedButton = page.locator('button').filter({ hasText: /^Skipped/ });

  const totalRequests = parseInt(await allButton.locator('span').innerText());
  const passed = parseInt(await passedButton.locator('span').innerText());
  const failed = parseInt(await failedButton.locator('span').innerText());
  const skipped = parseInt(await skippedButton.locator('span').innerText());

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
  // Ensure collection is visible and loaded
  const collectionContainer = page.locator('.collection-name').filter({ hasText: collectionName });
  await collectionContainer.waitFor({ state: 'visible' });
  // Wait a bit for the UI to stabilize
  await page.waitForTimeout(300);

  // Open collection actions menu
  await collectionContainer.locator('.collection-actions').hover();
  const icon = collectionContainer.locator('.collection-actions .icon');
  await icon.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(200); // Small delay to ensure hover state is stable
  await icon.click();

  // Click Run menu item
  await page.getByText('Run', { exact: true }).click();

  // Handle runner tab - reset if needed, then run
  const resetButton = page.getByRole('button', { name: 'Reset' });
  const runCollectionButton = page.getByRole('button', { name: 'Run Collection' });

  // Check if Reset button is visible (means there are existing results)
  const resetVisible = await resetButton.isVisible().catch(() => false);
  if (resetVisible) {
    await resetButton.click();
    // Wait a bit for the reset to complete
    await page.waitForTimeout(500);
  }

  // Now wait for and click Run Collection button
  await runCollectionButton.waitFor({ state: 'visible', timeout: 10000 });
  await runCollectionButton.click();

  // Wait for the run to complete
  await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 2 * 60 * 1000 });
};

/**
 * Sets up the JavaScript sandbox mode for a collection
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection (can be title or text)
 * @param mode - 'developer' or 'safe' mode
 * @returns void
 */
export const setSandboxMode = async (page: Page, collectionName: string, mode: 'developer' | 'safe') => {
  // Click on the collection name - try sidebar first, then fall back to collection tab/name
  // First try sidebar collection name (more reliable)
  const sidebarCollection = page.locator('#sidebar-collection-name').filter({ hasText: collectionName });
  const sidebarExists = await sidebarCollection.count().then((count) => count > 0).catch(() => false);

  if (sidebarExists) {
    await sidebarCollection.click();
  } else {
    // Fall back to collection by title or text
    const collectionByTitle = page.getByTitle(collectionName);
    const collectionByText = page.getByText(collectionName);
    const titleExists = await collectionByTitle.count().then((count) => count > 0).catch(() => false);
    if (titleExists) {
      await collectionByTitle.click();
    } else {
      await collectionByText.click();
    }
  }

  // Wait a moment for the UI to load
  await page.waitForTimeout(300);

  // Check if there's already a mode selected - if so, we need to click the badge to open settings tab
  // Look for the Developer Mode or Safe Mode badge/button
  const developerModeBadge = page.locator('.developer-mode').filter({ hasText: 'Developer Mode' });
  const safeModeBadge = page.locator('.safe-mode').filter({ hasText: 'Safe Mode' });

  const developerBadgeExists = await developerModeBadge.count().then((count) => count > 0).catch(() => false);
  const safeBadgeExists = await safeModeBadge.count().then((count) => count > 0).catch(() => false);

  // If a badge exists, click it to open the security settings tab
  if (developerBadgeExists || safeBadgeExists) {
    // Click the appropriate badge to open the security settings tab
    if (developerBadgeExists) {
      await developerModeBadge.click();
    } else {
      await safeModeBadge.click();
    }

    // Wait for the security settings tab to be active and form to be visible
    // Look for the security settings content - it should have "JavaScript Sandbox" heading
    await page.getByText('JavaScript Sandbox').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(300);
  }
  // If no badge exists, the modal should have appeared automatically (first time selection)

  // Wait for security settings form to be visible - wait for either radio button
  // These should be in the active tab (either modal or tab)
  const safeModeRadio = page.getByLabel('Safe Mode');
  const developerRadio = page.getByLabel('Developer Mode(use only if');

  // Wait for at least one of them to be visible
  await Promise.race([
    safeModeRadio.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    developerRadio.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  ]);

  // Additional wait to ensure UI is stable
  await page.waitForTimeout(300);

  if (mode === 'developer') {
    await developerRadio.waitFor({ state: 'visible', timeout: 5000 });
    await developerRadio.check();
  } else {
    // For safe mode, check if developer mode is currently selected
    const developerModeChecked = await developerRadio.isChecked().catch(() => false);

    if (developerModeChecked) {
      // Click the Developer Mode label text inside the security settings form
      // Scope to the form container to avoid clicking the badge
      // The form should have the "JavaScript Sandbox" heading, so scope to that container
      const securityForm = page.locator('div').filter({ hasText: 'JavaScript Sandbox' }).locator('..').first();
      const developerLabel = securityForm.locator('label').filter({ hasText: /^Developer Mode/ }).first();
      await developerLabel.waitFor({ state: 'visible', timeout: 5000 });
      await developerLabel.click();
      // Wait for UI to update
      await page.waitForTimeout(300);
    }

    // Ensure Safe Mode radio is visible and check it
    await safeModeRadio.waitFor({ state: 'visible', timeout: 5000 });
    await safeModeRadio.check();
  }

  await page.getByRole('button', { name: 'Save' }).click();
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
