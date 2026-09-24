import { test, expect } from '../../playwright';
import { openRunnerTab, buildRunnerLocators } from '../utils/page/index';

const COLLECTION_NAME = 'bruno-testbench';

/**
 * Waits for the config panel to finish loading and initializing requests.
 * On first load, all enabled requests are auto-selected, so we wait until selected === total.
 */
const waitForRequestsInitialized = async (locators) => {
  await expect(async () => {
    const text = await locators.configCounter().innerText();
    const match = text.match(/(\d+) of (\d+) selected/);
    expect(match).toBeTruthy();
    const selected = parseInt(match![1]);
    const total = parseInt(match![2]);
    expect(total).toBeGreaterThan(0);
    expect(selected).toBe(total);
  }).toPass({ timeout: 30000 });
};

test.describe('Runner Configuration Panel', () => {
  test('should display config panel with all requests selected by default', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerTab(page, COLLECTION_NAME);
    await waitForRequestsInitialized(locators);

    await test.step('Config panel is visible with request items', async () => {
      await expect(locators.configPanel()).toBeVisible();
      const itemCount = await locators.requestItems().count();
      expect(itemCount).toBeGreaterThan(0);
    });

    await test.step('Counter shows all enabled requests selected', async () => {
      const counterText = await locators.configCounter().innerText();
      const match = counterText.match(/(\d+) of (\d+) selected/);
      expect(match).toBeTruthy();
      expect(match![1]).toBe(match![2]);
    });

    await test.step('Select All button shows "Deselect All" when all selected', async () => {
      await expect(locators.selectAllButton()).toContainText('Deselect All');
    });
  });

  test('should toggle select all / deselect all', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerTab(page, COLLECTION_NAME);
    await waitForRequestsInitialized(locators);

    await test.step('Click Deselect All', async () => {
      await locators.selectAllButton().click();
      await expect(locators.selectAllButton()).toContainText('Select All', { timeout: 10000 });
      await expect(async () => {
        const counterText = await locators.configCounter().innerText();
        expect(counterText).toMatch(/^0 of \d+ selected$/);
      }).toPass({ timeout: 5000 });
    });

    await test.step('Click Select All', async () => {
      await locators.selectAllButton().click();
      await expect(locators.selectAllButton()).toContainText('Deselect All', { timeout: 10000 });
    });
  });

  test('should deselect individual request items', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerTab(page, COLLECTION_NAME);
    await waitForRequestsInitialized(locators);

    await test.step('Deselect first item and verify count decreases', async () => {
      const counterText = await locators.configCounter().innerText();
      const match = counterText.match(/(\d+) of (\d+) selected/);
      expect(match).toBeTruthy();
      const initialSelected = parseInt(match![1]);
      expect(initialSelected).toBeGreaterThan(1);

      // Click the checkbox area of the first request item to deselect it
      const firstItem = locators.requestItems().first();
      await firstItem.locator('.checkbox-container').click();

      // Verify count decreased by 1
      await expect(async () => {
        const newCounterText = await locators.configCounter().innerText();
        const newMatch = newCounterText.match(/(\d+) of (\d+) selected/);
        expect(parseInt(newMatch![1])).toBe(initialSelected - 1);
      }).toPass({ timeout: 5000 });
    });

    await test.step('Re-select item to restore state', async () => {
      const firstItem = locators.requestItems().first();
      await firstItem.locator('.checkbox-container').click();
      await waitForRequestsInitialized(locators);
    });
  });

  test('should set delay value', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerTab(page, COLLECTION_NAME);

    await test.step('Enter delay value', async () => {
      const delayInput = locators.delayInput();
      await expect(delayInput).toBeVisible();
      await delayInput.fill('500');
      await expect(delayInput).toHaveValue('500');
    });
  });

  test('should reset config panel to defaults', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerTab(page, COLLECTION_NAME);
    await waitForRequestsInitialized(locators);

    const counterText = await locators.configCounter().innerText();
    const initialMatch = counterText.match(/(\d+) of (\d+) selected/);
    const totalEnabled = parseInt(initialMatch![2]);

    await test.step('Deselect all items first', async () => {
      await locators.selectAllButton().click();
      await expect(locators.selectAllButton()).toContainText('Select All', { timeout: 10000 });
    });

    await test.step('Click config reset to restore defaults', async () => {
      await locators.configResetButton().click();

      // After reset, all enabled items should be re-selected
      await expect(async () => {
        const text = await locators.configCounter().innerText();
        const match = text.match(/(\d+) of (\d+) selected/);
        expect(match).toBeTruthy();
        expect(parseInt(match![1])).toBe(totalEnabled);
      }).toPass({ timeout: 5000 });
      await expect(locators.selectAllButton()).toContainText('Deselect All');
    });
  });

  test('should disable run button when no requests selected', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerLocators(page);
    await openRunnerTab(page, COLLECTION_NAME);
    await waitForRequestsInitialized(locators);

    await test.step('Deselect all and check run button is disabled', async () => {
      await locators.selectAllButton().click();
      await expect(locators.selectAllButton()).toContainText('Select All', { timeout: 10000 });
      const runButton = page.locator('button[type="submit"]');
      await expect(runButton).toBeDisabled({ timeout: 10000 });
    });

    await test.step('Select all and check run button is enabled', async () => {
      await locators.selectAllButton().click();
      await expect(locators.selectAllButton()).toContainText('Deselect All', { timeout: 10000 });
      const runButton = page.locator('button[type="submit"]');
      await expect(runButton).toBeEnabled({ timeout: 10000 });
    });
  });
});
