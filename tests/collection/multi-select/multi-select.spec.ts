import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { createCollection, createFolder, createRequest, expandFolder, closeAllCollections } from '../../utils/page/actions';

// Ctrl on Windows/Linux, Cmd on macOS (matches app's navigator.userAgent check).
const SELECT_MODIFIER: 'Meta' | 'Control' = process.platform === 'darwin' ? 'Meta' : 'Control';

// Clears selection and anchor to prevent setup state from bleeding into tests.
const clickEmptySidebarSpace = async (page) => {
  const listBox = await page.locator('.collections-list').boundingBox();
  await page.mouse.click(listBox.x + 10, listBox.y + listBox.height - 10);
};

const setupFixture = async (page, createTmpDir, tag) => {
  const locators = buildCommonLocators(page);
  const collectionADir = await createTmpDir(`${tag}-a`);
  const collectionBDir = await createTmpDir(`${tag}-b`);
  const collectionAName = `${tag} Collection A`;
  const collectionBName = `${tag} Collection B`;

  await createCollection(page, collectionAName, collectionADir);
  await createCollection(page, collectionBName, collectionBDir);
  await createFolder(page, 'Folder A', collectionAName);
  await expandFolder(page, 'Folder A');
  await createRequest(page, 'Req A1', 'Folder A', { inFolder: true });
  await createRequest(page, 'Req Root', collectionAName, {});
  await clickEmptySidebarSpace(page);

  return { locators, collectionAName, collectionBName };
};

test.describe('Sidebar multi-select and bulk actions', () => {
  test.afterEach(async ({ page }) => {
    // Clear selection so that closeAllCollections can use the standard collection menu
    await clickEmptySidebarSpace(page);
    await closeAllCollections(page);
  });

  test('Ctrl/Cmd-click toggles rows, adaptive right-click menu matches the selection, and clicking empty space clears it', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'toggle');

    await test.step('Ctrl/Cmd-click selects a folder and a request without clearing each other', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

      await expect(locators.sidebar.itemRow('Folder A')).toHaveClass(/item-selected/);
      await expect(locators.sidebar.itemRow('Req Root')).toHaveClass(/item-selected/);
    });

    await test.step('Ctrl/Cmd-click on an already-selected row toggles it back out of the selection', async () => {
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
      await expect(locators.sidebar.itemRow('Req Root')).not.toHaveClass(/item-selected/);
      await expect(locators.sidebar.itemRow('Folder A')).toHaveClass(/item-selected/);

      // Re-select it so the remaining steps see a folder + request selection again.
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
      await expect(locators.sidebar.itemRow('Req Root')).toHaveClass(/item-selected/);
    });

    await test.step('Right-clicking a selected row opens the adaptive bulk menu (Collapse + Delete, no Remove)', async () => {
      await locators.sidebar.itemRow('Req Root').click({ button: 'right' });

      await expect(locators.dropdown.item('Collapse')).toBeVisible();
      await expect(locators.dropdown.item('Delete')).toBeVisible();
      await expect(locators.dropdown.item('Remove')).not.toBeVisible();
    });

    await test.step('Clicking empty sidebar space clears the selection', async () => {
      await clickEmptySidebarSpace(page);

      await expect(locators.sidebar.itemRow('Folder A')).not.toHaveClass(/item-selected/);
      await expect(locators.sidebar.itemRow('Req Root')).not.toHaveClass(/item-selected/);
    });

    await test.step('With nothing selected, right-clicking a row shows the normal per-item menu instead', async () => {
      await locators.sidebar.itemRow('Req Root').click({ button: 'right' });
      await expect(locators.dropdown.item('Rename')).toBeVisible();
      await expect(locators.dropdown.item('Collapse')).not.toBeVisible();
      await page.keyboard.press('Escape');
    });
  });

  test('Shift-click selects a contiguous range spanning a folder and its requests', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'range');

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: ['Shift'] });

    // The range from Folder A to Req Root, inclusive, also covers Req A1 in between.
    await expect(locators.sidebar.itemRow('Folder A')).toHaveClass(/item-selected/);
    await expect(locators.sidebar.itemRow('Req A1')).toHaveClass(/item-selected/);
    await expect(locators.sidebar.itemRow('Req Root')).toHaveClass(/item-selected/);
  });

  test('Shift-click with no prior click anchor selects only the clicked row, not everything above it', async ({ page, createTmpDir }) => {
    const { locators, collectionAName } = await setupFixture(page, createTmpDir, 'shiftnoanchor');

    await locators.sidebar.folder('Folder A').click({ modifiers: ['Shift'] });

    await expect(locators.sidebar.itemRow('Folder A')).toHaveClass(/item-selected/);
    await expect(locators.sidebar.collectionRow(collectionAName)).not.toHaveClass(/collection-selected/);
    await expect(locators.sidebar.request('Req Root')).not.toHaveClass(/item-selected/);
  });

  test('A normally-clicked row is carried into the selection on the next Ctrl/Cmd-click', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'active');

    // Plain click: opens the request and becomes the anchor, but isn't itself "selected" yet.
    await locators.sidebar.request('Req Root').click();
    await expect(locators.sidebar.itemRow('Req Root')).not.toHaveClass(/item-selected/);

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });

    await expect(locators.sidebar.itemRow('Req Root')).toHaveClass(/item-selected/);
    await expect(locators.sidebar.itemRow('Folder A')).toHaveClass(/item-selected/);
  });

  test('Selecting a folder and its own child collapses to just the folder (parent wins) when deleting', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'parentwins');

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req A1').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Folder A').click({ button: 'right' });
    await locators.dropdown.item('Delete').click();

    // "parent-wins" means only the folder is in the effective selection (shows "Delete Folder").
    const deleteModal = locators.modal.byTitle('Delete Folder');
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal.getByText('1 folder')).toBeVisible();

    await locators.modal.closeButton().click();
    await expect(locators.sidebar.folder('Folder A')).toBeVisible();
    await expect(locators.sidebar.request('Req A1')).toBeVisible();
  });

  test('Bulk Delete on a folder + request selection removes both', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'bulkdelete');

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Req Root').click({ button: 'right' });
    await locators.dropdown.item('Delete').click();

    const deleteModal = locators.modal.byTitle('Delete Items');
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal.getByText('1 folder and 1 request')).toBeVisible();
    await locators.modal.button('Delete').click();

    await expect(locators.sidebar.folder('Folder A')).not.toBeVisible();
    await expect(locators.sidebar.request('Req Root')).not.toBeVisible();
  });

  test('Dragging a multi-selected folder + request moves both together', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'dragdrop');

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Folder A').dragTo(locators.sidebar.collection(collectionBName));

    const targetScope = locators.sidebar.collectionScope(collectionBName);
    await expect(targetScope.locator('.collection-item-name').filter({ hasText: 'Folder A' })).toBeVisible();
    await expect(targetScope.locator('.collection-item-name').filter({ hasText: 'Req Root' })).toBeVisible();

    const sourceScope = locators.sidebar.collectionScope(collectionAName);
    await expect(sourceScope.locator('.collection-item-name').filter({ hasText: 'Folder A' })).toHaveCount(0);
    await expect(sourceScope.locator('.collection-item-name').filter({ hasText: 'Req Root' })).toHaveCount(0);
  });

  test('Plain click on a new row clears an existing multi-selection', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'plainclear');

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
    await expect(locators.sidebar.itemRow('Folder A')).toHaveClass(/item-selected/);
    await expect(locators.sidebar.itemRow('Req Root')).toHaveClass(/item-selected/);

    await locators.sidebar.request('Req A1').click();

    await expect(locators.sidebar.itemRow('Folder A')).not.toHaveClass(/item-selected/);
    await expect(locators.sidebar.itemRow('Req Root')).not.toHaveClass(/item-selected/);
    await expect(locators.sidebar.itemRow('Req A1')).not.toHaveClass(/item-selected/);
  });

  test('Bulk menu for a pure collection selection offers Remove, Collapse, Remove Others and Collapse Others together', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'collectionmenu');
    // A third, unselected collection is needed for "Others" actions to be available.
    const collectionCDir = await createTmpDir('collectionmenu-c');
    const collectionCName = 'collectionmenu Collection C';
    await createCollection(page, collectionCName, collectionCDir);
    await clickEmptySidebarSpace(page);

    await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });

    // Exclude "Others" items to prevent ambiguous lookups for "Remove" and "Collapse".
    const removeItem = page.locator('.dropdown-item').filter({ hasText: 'Remove' }).filter({ hasNotText: 'Others' });
    const collapseItem = page.locator('.dropdown-item').filter({ hasText: 'Collapse' }).filter({ hasNotText: 'Others' });

    await expect(removeItem).toBeVisible();
    await expect(collapseItem).toBeVisible();
    await expect(locators.dropdown.item('Remove Others')).toBeVisible();
    await expect(locators.dropdown.item('Collapse Others')).toBeVisible();
    await expect(locators.dropdown.item('Delete')).not.toBeVisible();

    await clickEmptySidebarSpace(page);
  });

  test('Collapse Others becomes Expand Others once every other collection is already collapsed', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'collapseothers');

    await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });

    const collapseOthersItem = page.locator('.dropdown-item').filter({ hasText: 'Collapse Others' });
    const expandOthersItem = page.locator('.dropdown-item').filter({ hasText: 'Expand Others' });

    await test.step('Collection B starts expanded, so the item reads "Collapse Others"', async () => {
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await expect(collapseOthersItem).toBeVisible();
      await collapseOthersItem.click();
    });

    await test.step('With Collection B now collapsed, the same item reads "Expand Others"', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await expect(expandOthersItem).toBeVisible();
      await expandOthersItem.click();
    });
  });

  test('A collection + request mixed selection only offers Collapse (no Remove/Delete)', async ({ page, createTmpDir }) => {
    const { locators, collectionBName } = await setupFixture(page, createTmpDir, 'mixedcollreq');

    // Selecting Collection B with Req Root (in Collection A) prevents parent-wins logic.
    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Req Root').click({ button: 'right' });

    // Excludes "Collapse Others"/"Remove Others" so the lookup isn't ambiguous with those labels.
    const collapseItem = page.locator('.dropdown-item').filter({ hasText: 'Collapse' }).filter({ hasNotText: 'Others' });
    const removeItem = page.locator('.dropdown-item').filter({ hasText: 'Remove' }).filter({ hasNotText: 'Others' });
    await expect(collapseItem).toBeVisible();
    await expect(removeItem).not.toBeVisible();
    await expect(locators.dropdown.item('Delete')).not.toBeVisible();

    await clickEmptySidebarSpace(page);
  });

  test('Bulk Collapse on a multi-folder selection collapses all of them and clears the selection', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionDir = await createTmpDir('bulkcollapse');
    const collectionName = 'bulkcollapse Collection';

    await createCollection(page, collectionName, collectionDir);
    await createFolder(page, 'Folder One', collectionName);
    await createFolder(page, 'Folder Two', collectionName);
    await expandFolder(page, 'Folder One');
    await expandFolder(page, 'Folder Two');
    await createRequest(page, 'Req One', 'Folder One', { inFolder: true });
    await createRequest(page, 'Req Two', 'Folder Two', { inFolder: true });
    await clickEmptySidebarSpace(page);

    await locators.sidebar.folder('Folder One').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.folder('Folder Two').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Folder One').click({ button: 'right' });
    await locators.dropdown.item('Collapse').click();

    await expect(locators.sidebar.request('Req One')).not.toBeVisible();
    await expect(locators.sidebar.request('Req Two')).not.toBeVisible();
    await expect(locators.sidebar.folder('Folder One')).not.toHaveClass(/item-selected/);
    await expect(locators.sidebar.folder('Folder Two')).not.toHaveClass(/item-selected/);
  });

  test('Cancelling the bulk delete confirmation keeps the selection intact; confirming clears it', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'cancelkeep');

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Req Root').click({ button: 'right' });
    await locators.dropdown.item('Delete').click();

    const deleteModal = locators.modal.byTitle('Delete Items');
    await expect(deleteModal).toBeVisible();

    await test.step('Cancelling leaves the selection highlighted and nothing deleted', async () => {
      await locators.modal.closeButton().click();
      await expect(deleteModal).not.toBeVisible();

      await expect(locators.sidebar.itemRow('Folder A')).toHaveClass(/item-selected/);
      await expect(locators.sidebar.itemRow('Req Root')).toHaveClass(/item-selected/);
      await expect(locators.sidebar.folder('Folder A')).toBeVisible();
      await expect(locators.sidebar.request('Req Root')).toBeVisible();
    });

    await test.step('Re-opening and confirming deletes the items and clears the selection', async () => {
      await locators.sidebar.itemRow('Req Root').click({ button: 'right' });
      await locators.dropdown.item('Delete').click();
      await locators.modal.button('Delete').click();

      await expect(locators.sidebar.folder('Folder A')).not.toBeVisible();
      await expect(locators.sidebar.request('Req Root')).not.toBeVisible();
    });
  });

  test('Cancelling the bulk remove confirmation keeps the collection selection intact; confirming clears it', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'cancelclose');

    await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });

    const removeItem = page.locator('.dropdown-item').filter({ hasText: 'Remove' }).filter({ hasNotText: 'Others' });

    await test.step('Cancelling leaves both collections selected and open', async () => {
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await removeItem.click();

      const removeModal = locators.modal.byTitle('Remove Collections');
      await expect(removeModal).toBeVisible();
      await locators.modal.button('Cancel').click();
      await expect(removeModal).not.toBeVisible();

      await expect(locators.sidebar.collectionRow(collectionAName)).toHaveClass(/collection-selected/);
      await expect(locators.sidebar.collectionRow(collectionBName)).toHaveClass(/collection-selected/);
      await expect(locators.sidebar.collection(collectionAName)).toBeVisible();
      await expect(locators.sidebar.collection(collectionBName)).toBeVisible();
    });

    await test.step('Re-opening and confirming closes both collections', async () => {
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await removeItem.click();
      await locators.modal.button('Remove All').click();

      await expect(locators.sidebar.collection(collectionAName)).not.toBeVisible();
      await expect(locators.sidebar.collection(collectionBName)).not.toBeVisible();
    });
  });

  test('Bulk Remove on a multi-collection selection removes all selected collections', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'bulkclose');

    await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });

    // Exclude "Others" items to prevent ambiguous lookups for "Remove".
    const removeItem = page.locator('.dropdown-item').filter({ hasText: 'Remove' }).filter({ hasNotText: 'Others' });
    await expect(removeItem).toBeVisible();
    await removeItem.click();

    const removeModal = locators.modal.byTitle('Remove Collections');
    await expect(removeModal).toBeVisible();
    await locators.modal.button('Remove All').click();

    await expect(locators.sidebar.collection(collectionAName)).not.toBeVisible();
    await expect(locators.sidebar.collection(collectionBName)).not.toBeVisible();
  });
});
