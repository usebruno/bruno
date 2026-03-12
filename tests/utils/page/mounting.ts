import { test, expect, Page, ElectronApplication } from '../../../playwright';

/**
 * Collection tree item structure for assertions
 */
export type CollectionTreeItem = {
  name: string;
  type: 'folder' | 'request';
  method?: string; // For requests: GET, POST, PUT, DELETE, etc.
  items?: CollectionTreeItem[]; // For folders: nested items
};

export type CollectionTreeStructure = {
  name: string;
  items: CollectionTreeItem[];
};

/**
 * Open a collection from a filesystem path by mocking the Electron dialog
 * @param page - The Playwright page object
 * @param electronApp - The Electron application instance
 * @param collectionPath - The absolute path to the collection directory
 * @returns Promise that resolves when the collection appears in the sidebar
 */
export const openCollectionFromPath = async (
  page: Page,
  electronApp: ElectronApplication,
  collectionPath: string
): Promise<void> => {
  await test.step(`Open collection from path: ${collectionPath}`, async () => {
    // Mock the electron dialog to return the collection path
    await electronApp.evaluate(({ dialog }, { collectionPath }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [collectionPath]
      });
    }, { collectionPath });

    // Click on plus icon button and then "Open collection" in the dropdown
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Open collection' }).click();
  });
};

/**
 * Wait for a collection to finish mounting (loading spinner disappears and items are stable)
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection to wait for
 * @param options - Optional timeout settings
 */
export const waitForCollectionMount = async (
  page: Page,
  collectionName: string,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 30000 } = options;

  await test.step(`Wait for collection "${collectionName}" to finish mounting`, async () => {
    // First, wait for the collection to appear in the sidebar
    const collectionRow = page.getByTestId('sidebar-collection-row').filter({
      has: page.locator('#sidebar-collection-name', { hasText: collectionName })
    });
    await expect(collectionRow).toBeVisible({ timeout });

    // Wait for the loading spinner to disappear
    // The spinner is an IconLoader2 with class "animate-spin" inside the collection row
    const loadingSpinner = collectionRow.locator('.animate-spin');
    await expect(loadingSpinner).not.toBeVisible({ timeout });

    // Additional stabilization: wait a short time for any pending item updates
    await page.waitForTimeout(100);
  });
};

/**
 * Check if a collection is currently loading
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection to check
 * @returns True if the collection is loading, false otherwise
 */
export const isCollectionLoading = async (
  page: Page,
  collectionName: string
): Promise<boolean> => {
  const collectionRow = page.getByTestId('sidebar-collection-row').filter({
    has: page.locator('#sidebar-collection-name', { hasText: collectionName })
  });

  const loadingSpinner = collectionRow.locator('.animate-spin');
  return await loadingSpinner.isVisible();
};

/**
 * Get the loading state of a collection
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection
 * @returns Object with isLoading and isVisible flags
 */
export const getCollectionLoadingState = async (
  page: Page,
  collectionName: string
): Promise<{ isVisible: boolean; isLoading: boolean }> => {
  const collectionRow = page.getByTestId('sidebar-collection-row').filter({
    has: page.locator('#sidebar-collection-name', { hasText: collectionName })
  });

  const isVisible = await collectionRow.isVisible();
  if (!isVisible) {
    return { isVisible: false, isLoading: false };
  }

  const loadingSpinner = collectionRow.locator('.animate-spin');
  const isLoading = await loadingSpinner.isVisible();

  return { isVisible, isLoading };
};

/**
 * Count the number of items (requests + folders) in a collection
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection
 * @returns The count of visible items in the collection
 */
export const getCollectionItemCount = async (
  page: Page,
  collectionName: string
): Promise<number> => {
  // Find the collection row
  const collectionRow = page.getByTestId('sidebar-collection-row').filter({
    has: page.locator('#sidebar-collection-name', { hasText: collectionName })
  });

  // Get the parent wrapper that contains the collection and its items
  const collectionWrapper = collectionRow.locator('..');

  // Count all collection items within this collection
  const items = collectionWrapper.getByTestId('sidebar-collection-item-row');
  return await items.count();
};

/**
 * Get the tree structure of a collection for assertions
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection
 * @returns The collection tree structure
 */
export const getCollectionTreeStructure = async (
  page: Page,
  collectionName: string
): Promise<CollectionTreeStructure> => {
  return await test.step(`Get tree structure for collection "${collectionName}"`, async () => {
    // Find the collection
    const collectionRow = page.getByTestId('sidebar-collection-row').filter({
      has: page.locator('#sidebar-collection-name', { hasText: collectionName })
    });

    // Ensure collection is expanded
    const isCollapsed = await collectionRow.locator('.chevron-icon.rotate-90').count() === 0;
    if (isCollapsed) {
      await collectionRow.click();
      await page.waitForTimeout(100);
    }

    // Get all top-level items in this collection
    const collectionWrapper = collectionRow.locator('..');
    const items = await extractItemsFromContainer(page, collectionWrapper);

    return {
      name: collectionName,
      items
    };
  });
};

/**
 * Helper function to extract items from a container (collection or folder)
 */
async function extractItemsFromContainer(
  page: Page,
  container: ReturnType<Page['locator']>
): Promise<CollectionTreeItem[]> {
  const items: CollectionTreeItem[] = [];

  // Get direct child items (not nested in folders)
  const itemRows = container.locator('> div').getByTestId('sidebar-collection-item-row');
  const count = await itemRows.count();

  for (let i = 0; i < count; i++) {
    const itemRow = itemRows.nth(i);
    const itemName = await itemRow.locator('.collection-item-name').first().innerText();

    // Check if it's a folder (has folder chevron) or request
    const hasFolderChevron = await itemRow.getByTestId('folder-chevron').count() > 0;

    if (hasFolderChevron) {
      // It's a folder - get nested items
      const isExpanded = await itemRow.locator('.chevron-icon.rotate-90').count() > 0;
      if (!isExpanded) {
        // Expand folder to get nested items
        await itemRow.getByTestId('folder-chevron').click();
        await page.waitForTimeout(50);
      }

      const folderWrapper = itemRow.locator('..');
      const nestedItems = await extractItemsFromContainer(page, folderWrapper);

      items.push({
        name: itemName.trim(),
        type: 'folder',
        items: nestedItems
      });
    } else {
      // It's a request - get the method
      const methodBadge = itemRow.locator('.request-method-badge, .method-badge, [class*="method"]').first();
      let method = '';
      if (await methodBadge.count() > 0) {
        method = await methodBadge.innerText();
      }

      items.push({
        name: itemName.trim(),
        type: 'request',
        method: method.trim().toUpperCase() || undefined
      });
    }
  }

  return items;
}

/**
 * Expand a folder in the collection tree
 * @param page - The Playwright page object
 * @param folderName - The name of the folder to expand
 */
export const expandFolder = async (page: Page, folderName: string): Promise<void> => {
  await test.step(`Expand folder "${folderName}"`, async () => {
    const folderRow = page.getByTestId('sidebar-collection-item-row').filter({
      has: page.locator('.collection-item-name', { hasText: folderName })
    });

    const chevron = folderRow.getByTestId('folder-chevron');
    const isExpanded = await folderRow.locator('.chevron-icon.rotate-90').count() > 0;

    if (!isExpanded) {
      await chevron.click();
      // Wait for expansion animation
      await expect(folderRow.locator('.chevron-icon.rotate-90')).toBeVisible();
    }
  });
};

/**
 * Collapse a folder in the collection tree
 * @param page - The Playwright page object
 * @param folderName - The name of the folder to collapse
 */
export const collapseFolder = async (page: Page, folderName: string): Promise<void> => {
  await test.step(`Collapse folder "${folderName}"`, async () => {
    const folderRow = page.getByTestId('sidebar-collection-item-row').filter({
      has: page.locator('.collection-item-name', { hasText: folderName })
    });

    const chevron = folderRow.getByTestId('folder-chevron');
    const isExpanded = await folderRow.locator('.chevron-icon.rotate-90').count() > 0;

    if (isExpanded) {
      await chevron.click();
      // Wait for collapse animation
      await expect(folderRow.locator('.chevron-icon.rotate-90')).not.toBeVisible();
    }
  });
};

/**
 * Check if a folder is expanded
 * @param page - The Playwright page object
 * @param folderName - The name of the folder to check
 * @returns True if the folder is expanded, false otherwise
 */
export const isFolderExpanded = async (page: Page, folderName: string): Promise<boolean> => {
  const folderRow = page.getByTestId('sidebar-collection-item-row').filter({
    has: page.locator('.collection-item-name', { hasText: folderName })
  });

  return await folderRow.locator('.chevron-icon.rotate-90').count() > 0;
};

/**
 * Get all environment names from the environment selector for a collection
 * @param page - The Playwright page object
 * @returns Array of environment names
 */
export const getEnvironmentNames = async (page: Page): Promise<string[]> => {
  return await test.step('Get environment names from selector', async () => {
    // Open environment selector
    await page.getByTestId('environment-selector-trigger').click();

    // Wait for dropdown to appear
    await page.locator('.dropdown-item').first().waitFor({ state: 'visible' });

    // Get all environment options (excluding "No Environment" and action items)
    const envOptions = page.locator('.dropdown-item').filter({
      hasNot: page.locator('[data-item-id="no-environment"]')
    }).filter({
      hasNot: page.locator('[data-item-id="configure"]')
    });

    const names: string[] = [];
    const count = await envOptions.count();
    for (let i = 0; i < count; i++) {
      const text = await envOptions.nth(i).innerText();
      if (text && text.trim() !== 'No Environment' && text.trim() !== 'Configure') {
        names.push(text.trim());
      }
    }

    // Close dropdown by clicking elsewhere
    await page.keyboard.press('Escape');

    return names;
  });
};

/**
 * Wait for a specific number of items to be loaded in a collection
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection
 * @param expectedCount - The expected number of items
 * @param options - Optional timeout settings
 */
export const waitForItemCount = async (
  page: Page,
  collectionName: string,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> => {
  const { timeout = 30000 } = options;

  await test.step(`Wait for ${expectedCount} items in collection "${collectionName}"`, async () => {
    const collectionRow = page.getByTestId('sidebar-collection-row').filter({
      has: page.locator('#sidebar-collection-name', { hasText: collectionName })
    });
    const collectionWrapper = collectionRow.locator('..');
    const items = collectionWrapper.getByTestId('sidebar-collection-item-row');

    await expect(items).toHaveCount(expectedCount, { timeout });
  });
};

/**
 * Check if a collection has an error indicator on any item
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection
 * @returns True if any item has an error indicator
 */
export const hasErrorItems = async (page: Page, collectionName: string): Promise<boolean> => {
  const collectionRow = page.getByTestId('sidebar-collection-row').filter({
    has: page.locator('#sidebar-collection-name', { hasText: collectionName })
  });
  const collectionWrapper = collectionRow.locator('..');

  // Look for error indicators (typically a red icon or error class)
  const errorIndicators = collectionWrapper.locator('.item-error, .error-indicator, [class*="error"]');
  return await errorIndicators.count() > 0;
};

/**
 * Get names of items with errors in a collection
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection
 * @returns Array of item names that have errors
 */
export const getErrorItemNames = async (page: Page, collectionName: string): Promise<string[]> => {
  const collectionRow = page.getByTestId('sidebar-collection-row').filter({
    has: page.locator('#sidebar-collection-name', { hasText: collectionName })
  });
  const collectionWrapper = collectionRow.locator('..');

  const errorItems = collectionWrapper.locator('[data-testid="sidebar-collection-item-row"]').filter({
    has: page.locator('.item-error, .error-indicator, [class*="error"]')
  });

  const names: string[] = [];
  const count = await errorItems.count();
  for (let i = 0; i < count; i++) {
    const name = await errorItems.nth(i).locator('.collection-item-name').innerText();
    names.push(name.trim());
  }

  return names;
};
