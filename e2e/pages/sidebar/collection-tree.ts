import { Locator, Page, expect, test } from '../../playwright';
import { buildRequestTabsLocators } from '../app-shell/tabs';
import { buildOpenCollectionPickerLocators } from '../collection/open-collection-picker';
import { collectionSlug } from '../../../packages/bruno-app/src/utils/collections/collectionSlug';

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
  const inlineCollectionCreatorRoot = () => page.getByTestId('inline-collection-creator');

  return {
    inlineCollectionCreator: {
      root: inlineCollectionCreatorRoot,
      nameInput: () => inlineCollectionCreatorRoot().getByTestId('inline-collection-input'),
      advancedButton: () => inlineCollectionCreatorRoot().getByTestId('inline-collection-advanced-btn'),
      createButton: () => inlineCollectionCreatorRoot().getByTestId('inline-collection-save-btn'),
      cancelButton: () => inlineCollectionCreatorRoot().getByTestId('inline-collection-cancel-btn')
    },
    collectionsContainer: () => page.getByTestId('collections'),
    collectionsScroller: () => page.getByTestId('sidebar-collections-scroller'),
    collection: (name?: string) => name ? page.locator('#sidebar-collection-name').filter({ hasText: name }) : page.locator('#sidebar-collection-name'),
    collectionExact: (name: string) => page.locator('#sidebar-collection-name').and(page.getByTitle(name, { exact: true })),
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
    toggleSidebarButton: () => page.getByTestId('toggle-sidebar-button'),
    sidebarContainer: () => page.getByTestId('sidebar'),
    searchToggle: () => page.getByTestId('sidebar-search-toggle'),
    searchInput: () => page.getByTestId('sidebar-search-input'),
    searchClear: () => page.getByTestId('sidebar-search-clear-icon'),

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
  const handleBox = await locators.dragHandle().boundingBox();
  expect(handleBox).not.toBeNull();

  // The main pane overlaps the handle's right side, so grab it at its left edge.
  const y = handleBox!.y + handleBox!.height / 2;
  await page.mouse.move(handleBox!.x + 1, y);
  await page.mouse.down();
  // The sidebar sets its width to the pointer's x plus 2px.
  await page.mouse.move(width - 2, y, { steps: 5 });
  await page.mouse.up();

  await expect.poll(() => locators.sidebarContainer().evaluate((node: HTMLElement) => node.offsetWidth)).toBe(width);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

/**
 * Locators for folder rows in the sidebar tree.
 */
export const buildFolderLocators = (page: Page) => ({
  chevron: (folderName: string) => page.locator('.collection-item-name').filter({ hasText: folderName }).getByTestId('folder-chevron')
});

const buildLocators = (page: Page) => ({
  sidebar: buildSidebarLocators(page),
  folder: buildFolderLocators(page),
  tabs: buildRequestTabsLocators(page),
  openCollectionPicker: buildOpenCollectionPickerLocators(page)
});

/**
 * Clicks empty space in the sidebar, clearing any multi-selection and its click anchor.
 * @param page - The page object
 * @returns void
 */
export const clickEmptySidebarSpace = async (page) => {
  const locators = buildLocators(page);
  if (!(await locators.sidebar.collectionsContainer().isVisible())) return;
  const listBox = await locators.sidebar.collectionsContainer().boundingBox();
  if (!listBox) {
    throw new Error('collectionsContainer boundingBox is null');
  }
  await page.mouse.click(listBox.x + 10, listBox.y + listBox.height - 10);
};

// sidebar is virtualized, opening a request lower in the list scrolls the collection header
// out of the viewport, and Virtuoso unmounts it once it passes the overscan.
// Reset the list to the top so the header row is rendered before we locate it.
export const revealCollectionsTop = async (page: Page) => {
  const scroller = page.getByTestId('sidebar-collections-scroller');
  if (!(await scroller.count())) return;
  await scroller.evaluate((el) => el.scrollTo({ top: 0 }));
};

export const toggleOpenCollectionItem = async (page: Page, name: string) => {
  await test.step(`Toggle open collection checkbox for "${name}"`, async () => {
    await buildLocators(page).openCollectionPicker.itemCheckbox(name).click();
  });
};

/**
 * Expand a folder in the sidebar so its child requests/subfolders become visible.
 * No-op if the folder is already expanded.
 */
export const expandFolder = async (page: Page, folderName: string) => {
  await test.step(`Expand folder "${folderName}"`, async () => {
    const locators = buildLocators(page);
    const chevron = locators.folder.chevron(folderName);
    await chevron.waitFor({ state: 'visible', timeout: 5000 });
    const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
    if (!isExpanded) await chevron.click();
  });
};

/**
 * Collapse a folder in the sidebar so its child requests/subfolders unmount.
 * No-op if the folder is already collapsed.
 */
export const collapseFolder = async (page: Page, folderName: string) => {
  await test.step(`Collapse folder "${folderName}"`, async () => {
    const locators = buildLocators(page);
    const chevron = locators.folder.chevron(folderName);
    await chevron.waitFor({ state: 'visible', timeout: 5000 });
    const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
    if (isExpanded) await chevron.click();
  });
};

export const expandCollection = async (page: Page, collectionName: string) => {
  await test.step(`Expand collection "${collectionName}"`, async () => {
    const locators = buildLocators(page);
    const chevron = locators.sidebar.collectionChevron(collectionName);
    await chevron.waitFor({ state: 'visible', timeout: 5000 });
    const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
    if (!isExpanded) await chevron.click();
  });
};

/**
* Navigate to a collection and open a request
* @param page - The page object
* @param collectionName - The name of the collection
* @param requestName - The name of the request
*/
export const openRequest = async (page: Page, collectionName: string, requestName: string, { persist = false } = {}) => {
  await test.step(`Navigate to collection "${collectionName}" and open request "${requestName}"`, async () => {
    const collectionContainer = page.getByTestId('sidebar-collection-row').filter({ hasText: collectionName });
    await collectionContainer.click();
    const request = page
      .locator(`[data-collection-id="${collectionSlug(collectionName)}"]`)
      .getByTestId('sidebar-collection-item-row')
      .filter({ hasText: requestName });
    // The list is virtualized. a row outside the rendered window is absent from the DOM,
    // scroll it into view before interacting.
    await scrollSidebarListTo(page, request);
    if (!persist) {
      await request.click();
    } else {
      await request.dblclick();
    }
  });
};

/**
 * Open a folder's settings tab by clicking on it in the sidebar
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param folderName - The name of the folder
 * @param options - Optional settings (persist: double-click to make tab permanent)
 * @returns void
 */
export const openfolder = async (page: Page, collectionName: string, folderName: string, { persist = false } = {}) => {
  await test.step(`Open folder "${folderName}" in collection "${collectionName}"`, async () => {
    const collectionContainer = page.getByTestId('sidebar-collection-row').filter({ hasText: collectionName });
    await collectionContainer.click();
    const folder = page
      .locator(`[data-collection-id="${collectionSlug(collectionName)}"]`)
      .getByTestId('sidebar-collection-item-row')
      .filter({ hasText: folderName });
    if (!persist) {
      await folder.click();
    } else {
      await folder.dblclick();
    }
  });
};

/**
 * Open a request within a folder
 * Expand a folder in the sidebar and open a nested request.
 * Clicks collection → folder → request explicitly to ensure the tree is expanded.
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param folderName - The name of the folder
 * @param requestName - The name of the request
 */
export const openFolderRequest = async (page: Page, collectionName: string, folderName: string, requestName: string) => {
  await test.step(`Open folder request "${requestName}" in "${folderName}"`, async () => {
    const { sidebar, tabs } = buildLocators(page);
    const collectionRow = sidebar.collectionRow(collectionName);
    await collectionRow.click();
    const folder = sidebar.collectionScope(collectionName).locator('.collection-item-name').filter({ has: page.getByText(folderName, { exact: true }) });
    await folder.waitFor({ state: 'visible' });
    await folder.click();
    const request = sidebar.folderScope(folderName).locator('.collection-item-name').filter({ has: page.getByText(requestName, { exact: true }) });
    await request.waitFor({ state: 'visible' });
    await request.click();
    await expect(tabs.activeRequestTab()).toContainText(requestName);
  });
};

/**
 * Expand or collapse a request's examples in the sidebar. No-op if already in the requested state.
 */
export const toggleRequestExamples = async (page: Page, requestName: string, expand: boolean) => {
  await test.step(`${expand ? 'Expand' : 'Collapse'} examples of request "${requestName}"`, async () => {
    const locators = buildLocators(page);
    const chevron = locators.sidebar.requestExamplesToggle(requestName);
    await chevron.waitFor({ state: 'visible', timeout: 5000 });
    const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
    if (isExpanded !== expand) await chevron.click();
  });
};

export const openExampleFromSidebar = async (page: Page, requestName: string, exampleName: string, index: number = 0) => {
  const requestRow = page.locator('.collection-item-name').filter({ hasText: requestName }).first();
  const requestBranch = page.locator(`[data-parent-name="${requestName}"]`);
  const exampleRow = requestBranch
    .locator('.collection-item-name')
    .filter({ has: page.locator('.example-icon') })
    .getByText(exampleName, { exact: true })
    .nth(index);

  if (!(await exampleRow.isVisible())) {
    await requestRow.getByTestId('request-item-chevron').click();
  }

  await expect(exampleRow).toBeVisible();
  await exampleRow.click();
};

/**
 * The collections list is virtualized, so a row outside the viewport is not in
 * DOM. Scroll the request to view.

 * @param page - The page object
 * @param target - The row, or a control within a row, to scroll to
 * @returns void
 */
const scrollSidebarListTo = async (page: Page, target: Locator) => {
  const isRendered = () => target.isVisible().catch(() => false);
  if (await isRendered()) return;

  const scroller = page.getByTestId('sidebar-collections-scroller');
  if (!(await scroller.count())) return;
  await scroller.waitFor({ state: 'visible' });

  const viewports = await scroller.evaluate((el) => Math.ceil(el.scrollHeight / el.clientHeight));
  for (let viewport = 0; viewport <= viewports; viewport++) {
    await scroller.evaluate((el, offset) => el.scrollTo({ top: offset * el.clientHeight }), viewport);
    // react-virtuoso mounts rows asynchronously after a scroll, so let it settle before checking.
    await page.waitForTimeout(60);
    if (await isRendered()) return;
  }
};

/**
 * Open a request inside a folder by exact request name.
 * @param page - The page object
 * @param folderName - The name of the folder containing the request
 * @param requestName - The exact name of the request to open
 * @returns void
 */
export const openRequestInFolder = async (page: Page, folderName: string, requestName: string) => {
  await test.step(`Open request "${requestName}" in folder "${folderName}"`, async () => {
    const { sidebar } = buildLocators(page);
    await sidebar.folder(folderName).click();

    const folderWrapper = page.locator(`[data-parent-name="${folderName}"]`);
    const escapedName = requestName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const requestRow = folderWrapper.locator('.collection-item-name').filter({
      has: page.locator('.item-name').filter({ hasText: new RegExp(`^${escapedName}$`) })
    });
    await scrollSidebarListTo(page, requestRow);
    await requestRow.click();
  });
};
