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

  const collectionScope = (name: string) => page.locator(`[data-collection-id="${name.replace(/\s+/g, '-').toLowerCase()}"]`);
  const itemScope = (collectionName?: string) => collectionName ? collectionScope(collectionName) : page;

  return {
    collectionScope,
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
  // Counts currently-mounted item rows (exact for collections that fit without scrolling).
  return await locators.item.allRows(collectionName).count();
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
    // Ensure the collection is expanded.
    if (!(await locators.collection.isExpanded(collectionName))) {
      await locators.collection.row(collectionName).click();
    }
    await waitForCollectionMount(page, collectionName);

    // Expand every folder so the whole subtree is present in the (flat, virtualized) list.
    await expandAllFolders(page, collectionName, locators);

    // The sidebar is a flat, DFS-ordered list of rows; reconstruct the tree from each row's
    // indent depth (number of `.indent-block` spacers).
    const flat: FlatItem[] = [];
    for (const row of await locators.item.allRows(collectionName).all()) {
      const name = (await locators.item.getNameFromRow(row).innerText()).trim();
      const isFolder = (await locators.item.isFolderRow(row).count()) > 0;
      const depth = await row.locator('.indent-block').count();
      let method: string | undefined;
      if (!isFolder) {
        const badge = row.locator('.mr-1 span').first();
        method = (await badge.count()) > 0 ? (await badge.innerText()).trim().toUpperCase() : undefined;
      }
      flat.push({ name, isFolder, depth, method });
    }

    return { name: collectionName, items: buildTreeFromFlat(flat) };
  });
};

type FlatItem = { name: string; isFolder: boolean; depth: number; method?: string };

/** Expand every collapsed folder in the collection (expanding one can reveal more, so loop). */
async function expandAllFolders(
  page: Page,
  collectionName: string,
  locators: ReturnType<typeof buildCollectionTreeLocators>
): Promise<void> {
  for (let pass = 0; pass < 200; pass++) {
    const chevrons = locators.item.allRows(collectionName).getByTestId('folder-chevron');
    const total = await chevrons.count();
    let clicked = false;
    for (let i = 0; i < total; i++) {
      const chevron = chevrons.nth(i);
      const expanded = await chevron.evaluate((el) => el.classList.contains('rotate-90')).catch(() => true);
      if (!expanded) {
        await chevron.click();
        await page.waitForTimeout(50);
        clicked = true;
        break;
      }
    }
    if (!clicked) break;
  }
}

/** Rebuild the nested tree from a flat, DFS-ordered list of rows keyed by indent depth. */
function buildTreeFromFlat(flat: FlatItem[]): CollectionTreeItem[] {
  const root: CollectionTreeItem[] = [];
  const stack: { depth: number; items: CollectionTreeItem[] }[] = [{ depth: 0, items: root }];
  for (const r of flat) {
    while (stack.length > 1 && stack[stack.length - 1].depth >= r.depth) stack.pop();
    const parent = stack[stack.length - 1].items;
    if (r.isFolder) {
      const node: CollectionTreeItem = { name: r.name, type: 'folder', items: [] };
      parent.push(node);
      stack.push({ depth: r.depth, items: node.items as CollectionTreeItem[] });
    } else {
      parent.push({ name: r.name, type: 'request', method: r.method });
    }
  }
  return root;
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
    await expect(locators.item.allRows(collectionName)).toHaveCount(expectedCount, { timeout });
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
  const collectionWrapper = locators.collectionScope(collectionName);

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
  const collectionWrapper = locators.collectionScope(collectionName);

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
