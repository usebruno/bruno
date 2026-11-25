import { test, expect, type Locator, type Page } from '../../playwright';
import { buildCommonLocators, createCollection, closeAllCollections, createRequest } from '../../pages';

const COLLECTION = 'Context Menu Position';
const REQUEST = 'Context Menu Request';

// Tippy rounds the menu position to whole pixels, so allow a pixel or two of slack.
const MAX_OFFSET = 2;

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no bounding box (not visible)');
  return box;
};

// Where the next right-click lands in the viewport. A row can be scrolled before it is clicked, so
// the click position is read from the event the app receives instead of from an earlier measurement.
const nextContextMenuPoint = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ x: number; y: number }>((resolve) => {
        document.addEventListener(
          'contextmenu',
          (event) => resolve({ x: event.clientX, y: event.clientY }),
          { capture: true, once: true }
        );
      })
  );

// Right-clicks a row well inside it, away from the ⋯ button at its right end, and tells where it landed.
const rightClickRow = async (page: Page, row: Locator, x = 60) => {
  const clickedAt = nextContextMenuPoint(page);
  await row.click({ button: 'right', position: { x, y: (await boxOf(row)).height / 2 } });
  return clickedAt;
};

const expectMenuOnPoint = async (menu: Locator, point: { x: number; y: number }) => {
  const menuBox = await boxOf(menu);
  expect(Math.abs(menuBox.x - point.x)).toBeLessThanOrEqual(MAX_OFFSET);
  expect(Math.abs(menuBox.y - point.y)).toBeLessThanOrEqual(MAX_OFFSET);
};

// Closes a menu the test left open, since it can cover the ⋯ buttons the collection cleanup clicks.
const closeAllCollectionsAndMenus = async (page: Page) => {
  await page.keyboard.press('Escape');
  await closeAllCollections(page);
};

test.describe('Sidebar row context menu position', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollectionsAndMenus(page);
  });

  test('Right-clicking a collection row opens its menu at the pointer', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const rowMenu = sidebar.rowMenu(COLLECTION, 'collection');
    const row = sidebar.collectionRow(COLLECTION);
    const testDir = await createTmpDir('context-menu-position');

    await createCollection(page, COLLECTION, testDir);

    const point = await test.step('Right-click the row away from the ⋯ button', () => rightClickRow(page, row));

    await test.step('The menu opens with its top-left corner on the pointer', async () => {
      await expect(rowMenu.popup()).toBeVisible();
      await expectMenuOnPoint(rowMenu.popup(), point);
    });
  });

  test('Right-clicking a request row opens its menu at the pointer', async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const rowMenu = sidebar.rowMenu(REQUEST, 'item');
    const row = sidebar.itemRow(REQUEST);
    const testDir = await createTmpDir('context-menu-position-item');

    await createCollection(page, COLLECTION, testDir);
    await createRequest(page, REQUEST, COLLECTION, { url: 'https://echo.usebruno.com', method: 'GET' });

    const point = await test.step('Right-click the row away from the ⋯ button', () => rightClickRow(page, row));

    await test.step('The menu opens with its top-left corner on the pointer', async () => {
      await expect(rowMenu.popup()).toBeVisible();
      await expectMenuOnPoint(rowMenu.popup(), point);
    });
  });

  test('The menu stays where it opened when one of its items is right-clicked', async ({
    page,
    createTmpDir
  }) => {
    const { sidebar } = buildCommonLocators(page);
    const rowMenu = sidebar.rowMenu(REQUEST, 'item');
    const row = sidebar.itemRow(REQUEST);
    const testDir = await createTmpDir('context-menu-stays-put');

    await createCollection(page, COLLECTION, testDir);
    await createRequest(page, REQUEST, COLLECTION, { url: 'https://echo.usebruno.com', method: 'GET' });

    const point = await test.step('Right-click the row', () => rightClickRow(page, row));
    await expect(rowMenu.popup()).toBeVisible();
    const openedAt = await boxOf(rowMenu.popup());

    await test.step('Right-click one of the menu items', async () => {
      await rowMenu.popup().getByRole('menuitem').first().click({ button: 'right' });
    });

    await test.step('The menu is still open where it was', async () => {
      await expect(rowMenu.popup()).toBeVisible();
      await expectMenuOnPoint(rowMenu.popup(), point);
      const stillAt = await boxOf(rowMenu.popup());
      expect(Math.abs(stillAt.x - openedAt.x)).toBeLessThanOrEqual(MAX_OFFSET);
      expect(Math.abs(stillAt.y - openedAt.y)).toBeLessThanOrEqual(MAX_OFFSET);
    });
  });

  test('After a right-click, the ⋯ button still opens the menu under the button', async ({
    page,
    createTmpDir
  }) => {
    const { sidebar } = buildCommonLocators(page);
    const rowMenu = sidebar.rowMenu(COLLECTION, 'collection');
    const row = sidebar.collectionRow(COLLECTION);
    const testDir = await createTmpDir('context-menu-trigger');

    await createCollection(page, COLLECTION, testDir);
    const rowBox = await boxOf(row);

    await test.step('Right-click the row, then close the menu', async () => {
      await rightClickRow(page, row);
      await expect(rowMenu.popup()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(rowMenu.popup()).toBeHidden();
    });

    await test.step('Click the ⋯ button', async () => {
      await rowMenu.trigger().click();
      await expect(rowMenu.popup()).toBeVisible();
    });

    await test.step('The menu hangs below the ⋯ button, on its side of the row', async () => {
      const triggerBox = await boxOf(rowMenu.trigger());
      const menuBox = await boxOf(rowMenu.popup());
      expect(menuBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
      expect(menuBox.x).toBeGreaterThan(rowBox.x + rowBox.width / 2);
    });
  });
});

test.describe('Request tab context menu position', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollectionsAndMenus(page);
  });

  test('Right-clicking a request tab opens its menu at the pointer', async ({ page, createTmpDir }) => {
    const { tabs } = buildCommonLocators(page);
    const tabMenu = tabs.requestTabMenu();
    const label = tabs.requestTab(REQUEST);
    const testDir = await createTmpDir('tab-context-menu-position');

    await createCollection(page, COLLECTION, testDir);
    await createRequest(page, REQUEST, COLLECTION, { url: 'https://echo.usebruno.com', method: 'GET' });

    // Left of the close-gradient overlay, which covers the right end of a short tab name
    const point = await test.step('Right-click the tab label', () => rightClickRow(page, label, 12));

    await test.step('The menu opens with its top-left corner on the pointer', async () => {
      await expect(tabMenu).toBeVisible();
      await expectMenuOnPoint(tabMenu, point);
    });
  });
});
