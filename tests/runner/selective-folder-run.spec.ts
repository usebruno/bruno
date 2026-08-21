import { test, expect } from '../../playwright';
import {
  getRunnerResultCounts,
  getRunnerSelectionCounters,
  setSandboxMode,
  selectEnvironment,
  openFolderRunModal,
  getRequestItemsInFolderModal,
  runSelectedRequestsInFolder
} from '../utils/page';

const TEST_COLLECTION_NAME = 'bruno-testbench';
const TEST_FOLDER_PATH = ['scripting', 'api', 'bru', 'cookies'];

test.describe('Selective Folder Run', () => {
  const getSelectiveRunButton = (page) => page.locator('button').filter({ hasText: /Run \d+ Request/ }).first();
  const getRunButton = (page) => page.locator('button').filter({ hasText: /^Run \(/ });
  const getRecursiveRunButton = (page) => page.locator('button').filter({ hasText: /^Recursive Run \(/ });
  const openCookiesFolderRunModal = async (page) => {
    await setSandboxMode(page, TEST_COLLECTION_NAME, 'developer');
    await selectEnvironment(page, 'Local');
    await openFolderRunModal(page, TEST_COLLECTION_NAME, TEST_FOLDER_PATH);
  };
  const readButtonCount = async (locator) => {
    const text = await locator.innerText();
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };
  const closeRunnerModal = async (page) => {
    await page.keyboard.press('Escape');
    await page.locator('.bruno-modal-backdrop').first().waitFor({ state: 'hidden', timeout: 3000 });
  };

  test.beforeEach(async ({ pageWithUserData: page }) => {
    await openCookiesFolderRunModal(page);
  });

  test('shows request picker in folder run modal with all requests selected by default', async ({ pageWithUserData: page }) => {
    const requestItems = getRequestItemsInFolderModal(page);
    const itemCount = await requestItems.count();
    expect(itemCount).toBeGreaterThan(0);

    const selectedCount = await readButtonCount(getSelectiveRunButton(page));

    await expect(getRunButton(page)).toBeVisible();
    await expect(getRecursiveRunButton(page)).toBeVisible();
    await expect(getSelectiveRunButton(page)).toBeVisible();
    expect(selectedCount).toBe(itemCount);

    // Assert the "N of M selected" indicator: N should equal M (all selected)
    const selectionCounters = await getRunnerSelectionCounters(page);
    expect(selectionCounters.selected).toBe(itemCount);

    await closeRunnerModal(page);
  });

  test('disables selective run when no requests are selected', async ({ pageWithUserData: page }) => {
    await expect(async () => {
      const currentSelected = await readButtonCount(getSelectiveRunButton(page));
      if (currentSelected !== 0) {
        await page.getByTestId('runner-select-all').click();
      }
      expect(await readButtonCount(getSelectiveRunButton(page))).toBe(0);
    }).toPass({ timeout: 5000 });

    await expect(getSelectiveRunButton(page)).toBeDisabled();

    // Assert the "N of M selected" indicator: N should be 0
    const selectionCounters = await getRunnerSelectionCounters(page);
    expect(selectionCounters.selected).toBe(0);
    expect(selectionCounters.total).toBeGreaterThan(0);

    await closeRunnerModal(page);
  });

  test('runs only selected subset from folder request picker', async ({ pageWithUserData: page }) => {
    const requestItems = getRequestItemsInFolderModal(page);
    const initialCount = await requestItems.count();
    expect(initialCount).toBeGreaterThan(1);

    // Assert initial counter: all should be selected (N == M)
    let selectionCounters = await getRunnerSelectionCounters(page);
    expect(selectionCounters.selected).toBe(selectionCounters.total);
    expect(selectionCounters.total).toBe(initialCount);

    const deselectedRequestIndex = 0;
    const deselectedRequestName = (await requestItems
      .nth(deselectedRequestIndex)
      .getByTestId('runner-request-item-name')
      .innerText()).trim();
    await requestItems.nth(deselectedRequestIndex).getByTestId('runner-request-item-checkbox').click();
    await expect(async () => {
      expect(await readButtonCount(getSelectiveRunButton(page))).toBe(initialCount - 1);
    }).toPass({ timeout: 5000 });

    // Assert counter after deselecting one: N should be M-1
    selectionCounters = await getRunnerSelectionCounters(page);
    expect(selectionCounters.selected).toBe(initialCount - 1);
    expect(selectionCounters.total).toBe(initialCount);

    await runSelectedRequestsInFolder(page);

    const { totalRequests, failed } = await getRunnerResultCounts(page);
    expect(totalRequests).toBe(initialCount - 1);
    expect(failed).toBe(0);

    const resultDisplayNames = (await page.getByTestId('runner-result-item-name').allInnerTexts())
      .map((name) => name.trim());
    expect(resultDisplayNames).not.toContain(deselectedRequestName);
  });

  test('non-recursive run count is less than or equal to recursive run count', async ({ pageWithUserData: page }) => {
    await expect(getRunButton(page)).toBeVisible();
    await expect(getRecursiveRunButton(page)).toBeVisible();

    const nonRecursiveCount = await readButtonCount(getRunButton(page));
    const recursiveCount = await readButtonCount(getRecursiveRunButton(page));

    // Non-recursive only runs direct requests in the folder, not nested subfolders,
    // so it must always be ≤ the recursive count.
    expect(nonRecursiveCount).toBeGreaterThan(0);
    expect(recursiveCount).toBeGreaterThanOrEqual(nonRecursiveCount);

    // Assert the "N of M selected" indicator: N should equal M (all selected, all enabled/recursive)
    const selectionCounters = await getRunnerSelectionCounters(page);
    expect(selectionCounters.total).toBe(recursiveCount);
    expect(selectionCounters.selected).toBe(selectionCounters.total);

    await closeRunnerModal(page);
  });
});
