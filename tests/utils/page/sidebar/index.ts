import { Locator, Page, expect, test } from '../../../../playwright';
import { collectionSlug } from '../../../../packages/bruno-app/src/utils/collections/collectionSlug';

export type EmptyStateRequestType = 'http' | 'graphql' | 'grpc' | 'websocket';

/**
 * Locators for the sidebar (collections tree) section.
 */
export const buildSidebarLocators = (page: Page) => {
  const itemByName = (name: string): Locator =>
    page.locator('.item-name').and(page.getByTitle(name, { exact: true }));

  const collectionRow = (name: string) => page.getByTestId('sidebar-collection-row').filter({ hasText: name });
  const itemRow = (name: string) => page.getByTestId('sidebar-collection-item-row').filter({ hasText: name });
  const item = (name: string) => page.locator('.collection-item-name').filter({ hasText: name });

  const collectionScope = (name: string) => page.locator(`[data-collection-id="${collectionSlug(name)}"]`);

  return {
    collectionsContainer: () => page.getByTestId('collections'),
    collection: (name?: string) => name ? page.locator('#sidebar-collection-name').filter({ hasText: name }) : page.locator('#sidebar-collection-name'),
    item,
    folder: item,
    request: item,
    collectionChevron: (name: string) => collectionRow(name).getByTestId('collection-chevron'),
    folderRequest: (folderName: string, requestName: string) => {
      return page.locator(`[data-parent-name="${folderName}"]`).locator('.collection-item-name').filter({ hasText: requestName });
    },
    closeAllCollectionsButton: () => page.getByTestId('collections-header-actions-menu-close-all'),
    collectionRow,
    collectionRows: () => page.getByTestId('sidebar-collection-row'),
    invalidFilesBadge: (name: string) => collectionRow(name).getByTestId('invalid-files-badge'),
    invalidFilesTooltip: () => page.getByTestId('invalid-files-tooltip'),
    invalidFilesSeeHere: () => page.getByTestId('invalid-files-see-here'),
    folderInvalidFilesBadge: (collectionName: string, folderName: string) =>
      collectionScope(collectionName).getByTestId('sidebar-collection-item-row').filter({ has: itemByName(folderName) }).getByTestId('invalid-files-badge'),
    itemRow,
    itemByName,
    itemsIn: (collectionName: string, name: string): Locator =>
      collectionScope(collectionName).locator('.item-name').and(page.getByTitle(name, { exact: true })),
    itemRowIn: (collectionName: string, name: string): Locator =>
      collectionScope(collectionName).getByTestId('sidebar-collection-item-row').filter({ has: itemByName(name) }),

    // "+ Add request" cta inside the empty collection
    emptyStateCta: (collectionName: string): Locator =>
      collectionScope(collectionName).getByTestId('add-request-cta'),
    emptyStateCtaItem: (requestType: EmptyStateRequestType): Locator =>
      page.getByTestId(`add-request-cta-${requestType}`),

    // The "..." menu on a sidebar row. `type` picks the row and the testid prefix:
    // 'item' for a collection item row (`collection-item-menu-*`), 'collection' for a
    // top-level collection row (`collection-actions-*`). Trigger is in the row; items
    // are portaled to <body>, so page-scoped.
    rowMenu: (name: string, type: 'item' | 'collection' = 'item') => {
      const row = type === 'collection' ? collectionRow(name) : itemRow(name);
      const testId = type === 'collection' ? 'collection-actions' : 'collection-item-menu';
      return {
        trigger: () => row.getByTestId(testId),
        item: (action: string) => page.getByTestId(`${testId}-${action}`)
      };
    },
    requestExamplesToggle: (requestName: string) =>
      page.getByTestId('sidebar-collection-item-row').filter({ hasText: requestName }).getByTestId('request-item-chevron'),
    example: (name: string) => page.getByTestId('sidebar-response-example-item').filter({ hasText: name }),
    collectionScope,
    collectionScopeByUid: (collectionUid: string) => page.locator(`[data-collection-uid="${collectionUid}"]`),
    folderScope: (folderName: string) => page.locator(`[data-parent-name="${folderName}"]`),
    scopedItem: function (collectionName: string, itemName: string) {
      return this.collectionScope(collectionName).locator('.item-name').and(page.getByTitle(itemName, { exact: true }));
    },
    dragHandle: () => page.getByTestId('sidebar-drag-handle'),
    dragHandleTooltip: () => page.getByTestId('sidebar-drag-handle-tooltip-title'),
    toggleSidebarButton: () => page.getByTestId('toggle-sidebar-button'),
    sidebarContainer: () => page.getByTestId('sidebar'),

    // Modals opened from a sidebar row's "..." menu.
    renameItemModal: {
      nameInput: (): Locator => page.locator('#collection-item-name'),
      submit: (): Locator => page.getByTestId('rename-item-button'),
      filenameEditIcon: (): Locator => page.getByTestId('rename-request-edit-icon')
    },

    newRequestModal: {
      createButton: (): Locator => page.getByTestId('create-new-request-button'),
      filenameEditIcon: (): Locator => page.getByTestId('filename-edit-icon')
    },

    newFolderModal: {
      nameInput: (): Locator => page.getByTestId('new-folder-input')
    },

    cloneCollectionModal: {
      nameInput: (): Locator => page.locator('#collection-name'),
      locationInput: (): Locator => page.locator('#collection-location'),
      browseButton: (): Locator => page.getByText('Browse', { exact: true })
    },

    saveRequestModal: {
      modal: (): Locator => page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' }),
      nameInput: (): Locator => page.locator('#request-name')
    },

    filesystemName: {
      optionsButton: (): Locator => page.locator('.btn-advanced'),
      showFilesystemNameItem: (): Locator =>
        page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }),
      fileNameInput: (): Locator => page.locator('#file-name')
    }
  };
};

/**
 * Walks the sidebar to a folder and returns its row, expanding the collection and every parent
 * folder on the way — a collapsed node keeps its children out of the DOM entirely, so a nested
 * folder is unreachable until its ancestors are open. The target folder itself is left as it is.
 * @param page - The Playwright page object
 * @param collectionName - The collection holding the folder
 * @param folderPath - Folder names from the collection root down to the target folder
 * @returns The target folder's `.collection-item-name` row, ready to click, hover or double-click
 */
export const revealFolderRow = async (
  page: Page,
  collectionName: string,
  folderPath: string[]
): Promise<Locator> => {
  return await test.step(`Reveal folder "${folderPath.join('/')}" in "${collectionName}"`, async () => {
    const locators = buildSidebarLocators(page);

    const collectionChevron = locators.collectionChevron(collectionName);
    await expect(collectionChevron).toBeVisible();
    const isCollectionExpanded = await collectionChevron.evaluate((el: HTMLElement) =>
      el.classList.contains('rotate-90')
    );
    if (!isCollectionExpanded) {
      await collectionChevron.click();
    }

    // The sidebar is a flat, virtualized list: rows are siblings rather than nested wrappers, so
    // each level is scoped by `data-collection-id` / `data-parent-name` instead of DOM ancestry.
    let scope = locators.collectionScope(collectionName);
    for (const folderName of folderPath.slice(0, -1)) {
      const row = scope.locator('.collection-item-name').filter({ hasText: folderName }).first();
      await expect(row).toBeVisible();

      const chevron = row.getByTestId('folder-chevron');
      const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
      if (!isExpanded) {
        await chevron.click();
      }
      scope = locators.folderScope(folderName);
    }

    const targetRow = scope
      .locator('.collection-item-name')
      .filter({ hasText: folderPath[folderPath.length - 1] })
      .first();
    await expect(targetRow).toBeVisible();
    return targetRow;
  });
};

export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 600;

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'bruno.sidebarCollapsed';

// Grab the left edge because the main pane overlaps the handle.
const HANDLE_EDGE_POSITION = { x: 1, y: 10 };

/** Get the sidebar width in pixels (0 when collapsed). */
export const getSidebarWidth = async (page: Page): Promise<number> => {
  return buildSidebarLocators(page).sidebarContainer().evaluate((node: HTMLElement) => node.offsetWidth);
};

/** Get the saved collapsed state ('true', 'false', or null). */
export const getStoredSidebarState = async (page: Page): Promise<string | null> => {
  return page.evaluate((key) => window.localStorage.getItem(key), SIDEBAR_COLLAPSED_STORAGE_KEY);
};

/** Expand the sidebar if collapsed and wait for it to finish opening. */
export const expandSidebar = async (page: Page) => {
  await test.step('Expand sidebar', async () => {
    if ((await getSidebarWidth(page)) === 0) {
      await buildSidebarLocators(page).toggleSidebarButton().click();
    }

    // Wait for the sidebar animation to finish so we get its final width.
    await page.waitForFunction(async () => {
      const node = document.querySelector('[data-testid="sidebar"]') as HTMLElement | null;
      if (!node) return false;

      const readWidth = () => node.getBoundingClientRect().width;
      const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const first = readWidth();
      if (first === 0) return false;

      await nextFrame();
      const second = readWidth();
      await nextFrame();
      const third = readWidth();

      return first === second && second === third;
    });
  });
};

/** Drag the sidebar handle to a horizontal screen position. */
export const dragSidebarTo = async (page: Page, x: number) => {
  await test.step(`Drag sidebar to x=${x}`, async () => {
    const handle = buildSidebarLocators(page).dragHandle();
    await handle.waitFor({ state: 'visible' });

    const box = await handle.boundingBox();
    if (!box) throw new Error('Sidebar drag handle has no bounding box');

    const y = box.y + box.height / 2;

    await page.mouse.move(box.x + HANDLE_EDGE_POSITION.x, y);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 5 });
    await page.mouse.up();
  });
};

/** Move the handle by dx pixels to test small pointer movements. */
export const dragSidebarBy = async (page: Page, dx: number) => {
  await test.step(`Move sidebar handle by ${dx}px`, async () => {
    const handle = buildSidebarLocators(page).dragHandle();
    await handle.waitFor({ state: 'visible' });

    const box = await handle.boundingBox();
    if (!box) throw new Error('Sidebar drag handle has no bounding box');

    const y = box.y + box.height / 2;
    const startX = box.x + HANDLE_EDGE_POSITION.x;

    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX + dx, y);
    await page.mouse.up();
  });
};

/** Hover over the sidebar resize handle. */
export const hoverSidebarHandle = async (page: Page) => {
  await test.step('Hover sidebar handle', async () => {
    await buildSidebarLocators(page).dragHandle().hover({ position: HANDLE_EDGE_POSITION });
  });
};

/**
 * Drags the sidebar's edge until the sidebar is `width` wide, and waits until the layout has
 * settled at that width. The sidebar ignores drags of under 3px, so `width` must be at least that
 * far from the current width, or equal to it.
 * @param page - The Playwright page object
 * @param width - The sidebar width to drag to, between MIN_SIDEBAR_WIDTH and MAX_SIDEBAR_WIDTH
 * @returns void
 */
export const dragSidebarToWidth = async (page: Page, width: number) => {
  const locators = buildSidebarLocators(page);
  // The sidebar sets its width to the pointer's x plus 2px.
  await dragSidebarTo(page, width - 2);

  await expect.poll(() => locators.sidebarContainer().evaluate((node: HTMLElement) => node.offsetWidth)).toBe(width);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
