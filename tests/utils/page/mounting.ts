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
 * Build locators for collection tree elements in the sidebar
 */
export const buildCollectionTreeLocators = (page: Page) => {
  const collectionRow = (name: string) => page.getByTestId('sidebar-collection-row').filter({
    has: page.locator('#sidebar-collection-name', { hasText: name })
  });

  const itemScope = (collectionName?: string) => collectionName
    ? collectionRow(collectionName).locator('..')
    : page;

  return {
  /**
   * Collection-level locators
   */
    collection: {
    /** Get collection row by name */
      row: collectionRow,
      /** Get collection name element */
      name: (name: string) => page.locator('#sidebar-collection-name').filter({ hasText: name }),
      /** Get collection chevron (expand/collapse icon) */
      chevron: (name: string) => collectionRow(name).locator('.chevron-icon'),
      /** Get collection loading spinner */
      loadingSpinner: (name: string) => collectionRow(name).locator('.animate-spin'),
      /** Check if collection is expanded (chevron rotated) */
      isExpanded: async (name: string) => {
        return await collectionRow(name).locator('.rotate-90').count() > 0;
      }
    },

    /**
   * Collection item (folder/request) locators
   */
    item: {
    /** Get item row by name (exact match) and collectionName */
      row: (name: string, collectionName?: string) => itemScope(collectionName).getByTestId('sidebar-collection-item-row').filter({
        has: page.locator('.item-name').getByText(name, { exact: true })
      }),
      /** Get item name element */
      name: (name: string) => page.locator('.item-name').getByText(name, { exact: true }),
      /** Get all item rows */
      allRows: (collectionName?: string) => itemScope(collectionName).getByTestId('sidebar-collection-item-row'),
      /** Check if a given item row is a folder (has folder chevron) */
      isFolderRow: (itemRow: ReturnType<Page['locator']>) => itemRow.getByTestId('folder-chevron'),
      /** Get the name text from an item row */
      getNameFromRow: (itemRow: ReturnType<Page['locator']>) => itemRow.locator('.item-name').first()
    },

    /**
   * Folder-specific locators
   */
    folder: {
    /** Get folder row by name (exact match) */
      row: (name: string, collectionName?: string) => itemScope(collectionName).getByTestId('sidebar-collection-item-row').filter({
        has: page.locator('.item-name').getByText(name, { exact: true })
      }).filter({
        has: page.getByTestId('folder-chevron')
      }),
      /** Get folder chevron (expand/collapse icon) - exact name match */
      chevron: (name: string, collectionName?: string) => itemScope(collectionName).getByTestId('sidebar-collection-item-row').filter({
        has: page.locator('.item-name').getByText(name, { exact: true })
      }).getByTestId('folder-chevron'),
      /** Check if folder is expanded (exact name match) */
      isExpanded: async (name: string, collectionName?: string) => {
        const row = itemScope(collectionName).getByTestId('sidebar-collection-item-row').filter({
          has: page.locator('.item-name').getByText(name, { exact: true })
        });
        return await row.locator('.rotate-90').count() > 0;
      }
    },

    /**
   * Request-specific locators
   */
    request: {
    /** Get request row by name */
      row: (name: string, collectionName?: string) => itemScope(collectionName).getByTestId('sidebar-collection-item-row').filter({
        has: page.locator('.item-name', { hasText: name })
      }).filter({
        hasNot: page.getByTestId('folder-chevron')
      }),
      /** Get request method badge */
      methodBadge: (name: string, collectionName?: string) => itemScope(collectionName).getByTestId('sidebar-collection-item-row').filter({
        has: page.locator('.item-name', { hasText: name })
      }).locator('.mr-1 span').first()
    }
  };
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
  const locators = buildCollectionTreeLocators(page);

  await test.step(`Wait for collection "${collectionName}" to finish mounting`, async () => {
    // First, wait for the collection to appear in the sidebar
    await expect(locators.collection.row(collectionName)).toBeVisible({ timeout });

    // Wait for the loading spinner to disappear
    await expect(locators.collection.loadingSpinner(collectionName)).not.toBeVisible({ timeout });
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
  const locators = buildCollectionTreeLocators(page);
  return await locators.collection.loadingSpinner(collectionName).isVisible();
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
  const locators = buildCollectionTreeLocators(page);

  const isVisible = await locators.collection.row(collectionName).isVisible();
  if (!isVisible) {
    return { isVisible: false, isLoading: false };
  }

  const isLoading = await locators.collection.loadingSpinner(collectionName).isVisible();
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
  const locators = buildCollectionTreeLocators(page);

  // Get the parent wrapper that contains the collection and its items
  const collectionWrapper = locators.collection.row(collectionName).locator('..');

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
  const locators = buildCollectionTreeLocators(page);

  return await test.step(`Get tree structure for collection "${collectionName}"`, async () => {
    const collectionRow = locators.collection.row(collectionName);

    // Ensure collection is expanded
    const isExpanded = await locators.collection.isExpanded(collectionName);
    if (!isExpanded) {
      await collectionRow.click();
    }

    // Wait for collection to finish mounting after expansion
    await waitForCollectionMount(page, collectionName);

    // Collection structure:
    // StyledWrapper > [collection-row, children-wrapper > inner-container > items]
    // Get the sibling div that contains the children (not the collection row itself)
    const collectionWrapper = collectionRow.locator('..');
    const childrenContainer = collectionWrapper.locator(':scope > div:not([data-testid="sidebar-collection-row"]) > div').first();

    const items = await extractItemsFromContainer(page, childrenContainer, collectionName);

    return {
      name: collectionName,
      items
    };
  });
};

/**
 * Helper function to extract items from a container (collection or folder).
 */
async function extractItemsFromContainer(
  page: Page,
  container: ReturnType<Page['locator']>,
  collectionName?: string
): Promise<CollectionTreeItem[]> {
  const locators = buildCollectionTreeLocators(page);
  const items: CollectionTreeItem[] = [];

  // Get direct child StyledWrappers, each contains one item
  // Structure: container > StyledWrapper > [item-row, children-div?]
  const childWrappers = container.locator(':scope > div:has([data-testid="sidebar-collection-item-row"])');
  const count = await childWrappers.count();

  for (let i = 0; i < count; i++) {
    const wrapper = childWrappers.nth(i);
    const itemRow = wrapper.getByTestId('sidebar-collection-item-row').first();
    const itemName = (await locators.item.getNameFromRow(itemRow).innerText()).trim();

    // Check if it's a folder by looking for folder chevron within this specific row
    const isFolder = await locators.item.isFolderRow(itemRow).count() > 0;

    if (isFolder) {
      // It's a folder - expand it via the chevron in this exact row to avoid
      // matching same-named folders elsewhere in the tree.
      const folderChevron = locators.item.isFolderRow(itemRow);
      const rowIsExpanded = await itemRow.locator('.rotate-90').count() > 0;
      if (!rowIsExpanded) {
        await folderChevron.click();
        await expect.poll(async () => await itemRow.locator('.rotate-90').count() > 0).toBe(true);
      }

      // Children are in a sibling div after the item row (within the same wrapper)
      // Structure: wrapper > [item-row, children-container]
      const childrenContainer = wrapper.locator(':scope > div:not([data-testid="sidebar-collection-item-row"])').first();
      const hasChildren = await childrenContainer.count() > 0;
      const nestedItems = hasChildren ? await extractItemsFromContainer(page, childrenContainer, collectionName) : [];

      items.push({
        name: itemName,
        type: 'folder',
        items: nestedItems
      });
    } else {
      // It's a request - read the method badge from this exact row to avoid
      // colliding with same-named requests elsewhere.
      const methodBadge = itemRow.locator('.mr-1 span').first();
      let method = '';
      if (await methodBadge.count() > 0) {
        method = (await methodBadge.innerText()).trim().toUpperCase();
      }

      items.push({
        name: itemName,
        type: 'request',
        method: method || undefined
      });
    }
  }

  return items;
}

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
  const locators = buildCollectionTreeLocators(page);

  await test.step(`Wait for ${expectedCount} items in collection "${collectionName}"`, async () => {
    const collectionWrapper = locators.collection.row(collectionName).locator('..');
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
  const locators = buildCollectionTreeLocators(page);
  const collectionWrapper = locators.collection.row(collectionName).locator('..');

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
  const locators = buildCollectionTreeLocators(page);
  const collectionWrapper = locators.collection.row(collectionName).locator('..');

  const errorItems = collectionWrapper.getByTestId('sidebar-collection-item-row').filter({
    has: page.locator('.item-error, .error-indicator, [class*="error"]')
  });

  const names: string[] = [];
  const count = await errorItems.count();
  for (let i = 0; i < count; i++) {
    const name = await errorItems.nth(i).locator('.item-name').innerText();
    names.push(name.trim());
  }

  return names;
};
