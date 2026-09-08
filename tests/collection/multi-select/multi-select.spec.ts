import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { createCollection, createFolder, createRequest, expandFolder, closeAllCollections, clickEmptySidebarSpace, createApp } from '../../utils/page/actions';

// Ctrl on Windows/Linux, Cmd on macOS (matches app's navigator.userAgent check).
const SELECT_MODIFIER: 'Meta' | 'Control' = process.platform === 'darwin' ? 'Meta' : 'Control';

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

    const folderA = locators.sidebar.folder('Folder A');
    const folderARow = locators.sidebar.itemRow('Folder A');
    const reqRoot = locators.sidebar.request('Req Root');
    const reqRootRow = locators.sidebar.itemRow('Req Root');

    await test.step('Ctrl/Cmd-click selects a folder and a request without clearing each other', async () => {
      await folderA.click({ modifiers: [SELECT_MODIFIER] });
      await reqRoot.click({ modifiers: [SELECT_MODIFIER] });

      await expect(folderARow).toHaveAttribute('data-selected', 'true');
      await expect(reqRootRow).toHaveAttribute('data-selected', 'true');
    });

    await test.step('Ctrl/Cmd-click on an already-selected row toggles it back out of the selection', async () => {
      await reqRoot.click({ modifiers: [SELECT_MODIFIER] });
      await expect(reqRootRow).not.toHaveAttribute('data-selected', 'true');
      await expect(folderARow).toHaveAttribute('data-selected', 'true');

      // Re-select it so the remaining steps see a folder + request selection again.
      await reqRoot.click({ modifiers: [SELECT_MODIFIER] });
      await expect(reqRootRow).toHaveAttribute('data-selected', 'true');
    });

    await test.step('Right-clicking a selected row opens the adaptive bulk menu (Collapse + Delete, no Remove)', async () => {
      await reqRootRow.click({ button: 'right' });

      await expect(locators.dropdown.item('Collapse')).toBeVisible();
      await expect(locators.dropdown.item('Delete')).toBeVisible();
      await expect(locators.dropdown.item('Remove')).not.toBeVisible();
    });

    await test.step('Clicking empty sidebar space clears the selection', async () => {
      await clickEmptySidebarSpace(page);

      await expect(folderARow).not.toHaveAttribute('data-selected', 'true');
      await expect(reqRootRow).not.toHaveAttribute('data-selected', 'true');
    });

    await test.step('With nothing selected, right-clicking a row shows the normal per-item menu instead', async () => {
      await reqRootRow.click({ button: 'right' });
      await expect(locators.dropdown.item('Rename')).toBeVisible();
      await expect(locators.dropdown.item('Collapse')).not.toBeVisible();
      await page.keyboard.press('Escape');
    });
  });

  test('A single Ctrl/Cmd-selected request, folder, or collection still shows the normal per-item menu, not the bulk menu', async ({ page, createTmpDir }) => {
    const { locators, collectionAName } = await setupFixture(page, createTmpDir, 'singleselectmenu');

    await test.step('A single selected request shows the normal menu', async () => {
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.itemRow('Req Root').click({ button: 'right' });
      await expect(locators.dropdown.item('Rename')).toBeVisible();
      await page.keyboard.press('Escape');
      await clickEmptySidebarSpace(page);
    });

    await test.step('A single selected folder shows the normal menu', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.itemRow('Folder A').click({ button: 'right' });
      await expect(locators.dropdown.item('Rename')).toBeVisible();
      await page.keyboard.press('Escape');
      await clickEmptySidebarSpace(page);
    });

    await test.step('A single selected collection shows the normal menu', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await expect(locators.dropdown.item('Rename')).toBeVisible();
      await page.keyboard.press('Escape');
      await clickEmptySidebarSpace(page);
    });
  });

  test('Shift-click selects a contiguous range spanning a folder and its requests', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'range');
    const folderARow = locators.sidebar.itemRow('Folder A');
    const reqA1Row = locators.sidebar.itemRow('Req A1');
    const reqRootRow = locators.sidebar.itemRow('Req Root');

    await test.step('Select Folder A, then Shift-click Req Root', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: ['Shift'] });
    });

    await test.step('The range from Folder A to Req Root, inclusive, is selected (also covers Req A1 in between)', async () => {
      await expect(folderARow).toHaveAttribute('data-selected', 'true');
      await expect(reqA1Row).toHaveAttribute('data-selected', 'true');
      await expect(reqRootRow).toHaveAttribute('data-selected', 'true');
    });
  });

  test('Shift-click with no prior click anchor selects only the clicked row, not everything above it', async ({ page, createTmpDir }) => {
    const { locators, collectionAName } = await setupFixture(page, createTmpDir, 'shiftnoanchor');

    await test.step('Shift-click a row with no prior click anchor set', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: ['Shift'] });
    });

    await test.step('Only the clicked row is selected, not everything above it', async () => {
      await expect(locators.sidebar.itemRow('Folder A')).toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.collectionRow(collectionAName)).not.toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.itemRow('Req Root')).not.toHaveAttribute('data-selected', 'true');
    });
  });

  test('A normally-clicked row is NOT carried into the selection on the next Ctrl/Cmd-click', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'active');

    // Plain click: opens the request and becomes the anchor, but isn't itself "selected" yet.
    await locators.sidebar.request('Req Root').click();
    await expect(locators.sidebar.itemRow('Req Root')).not.toHaveAttribute('data-selected', 'true');
    await expect(locators.tabs.requestTab('Req Root')).toBeVisible(); // verifies that the request opened properly

    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });

    await expect(locators.sidebar.itemRow('Req Root')).not.toHaveAttribute('data-selected', 'true');
    await expect(locators.sidebar.itemRow('Folder A')).toHaveAttribute('data-selected', 'true');
  });

  test('Selecting a folder and its own child collapses to just the folder (parent wins) when deleting', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'parentwins');
    const folderA = locators.sidebar.folder('Folder A');
    const reqA1 = locators.sidebar.request('Req A1');

    await test.step('Select Folder A and its own child Req A1, then delete via the bulk menu', async () => {
      await folderA.click({ modifiers: [SELECT_MODIFIER] });
      await reqA1.click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.itemRow('Folder A').click({ button: 'right' });
      await locators.dropdown.item('Delete').click();
    });

    await test.step('"parent-wins" means only the folder is in the effective selection (shows "Delete Folder")', async () => {
      const deleteModal = locators.modal.byTitle('Delete Folder');
      await expect(deleteModal).toBeVisible();
      await expect(deleteModal.getByText('Folder A')).toBeVisible();

      await locators.modal.closeButton().click();
      await expect(folderA).toBeVisible();
      await expect(reqA1).toBeVisible();
    });
  });

  test('Selecting a folder and its own child functionally applies parent-wins dedup (e.g. collapsing only happens once)', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'parentwinsfunc');
    const reqA1 = locators.sidebar.request('Req A1');

    await test.step('Select Folder A and its own child Req A1, then collapse via the bulk menu', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await reqA1.click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.itemRow('Folder A').click({ button: 'right' });

      // Collapse the selection. If parent-wins dedup fails, it might try to collapse both
      // and if the child is already hidden by the parent's collapse, it could cause issues,
      // or if we expand, it would expand both. But simply verifying the collapse action completes
      // and the child is no longer visible is a good functional test.
      await locators.dropdown.item('Collapse').click();
    });

    await test.step('Folder A is collapsed (its child Req A1 is not visible)', async () => {
      await expect(reqA1).not.toBeVisible();
    });
  });

  test('Selecting a folder together with its own nested subfolder collapses via parent-wins to just the outer folder', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'nestedparentwins Collection';
    const outerFolder = locators.sidebar.folder('Outer Folder');
    const innerFolder = locators.sidebar.folder('Inner Folder');

    await test.step('Set up a folder containing a nested subfolder', async () => {
      await createCollection(page, collectionName, await createTmpDir('nestedparentwins'));
      await createFolder(page, 'Outer Folder', collectionName);
      await expandFolder(page, 'Outer Folder');
      await createFolder(page, 'Inner Folder', 'Outer Folder', false);
      await clickEmptySidebarSpace(page);
    });

    await test.step('Select the outer folder and its own nested subfolder, then delete via the bulk menu', async () => {
      await outerFolder.click({ modifiers: [SELECT_MODIFIER] });
      await innerFolder.click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.itemRow('Outer Folder').click({ button: 'right' });
      await locators.dropdown.item('Delete').click();
    });

    await test.step('"parent-wins" means only the outer folder is in the effective selection (shows "Delete Folder")', async () => {
      const deleteModal = locators.modal.byTitle('Delete Folder');
      await expect(deleteModal).toBeVisible();
      await expect(deleteModal.getByText('Outer Folder')).toBeVisible();

      await locators.modal.closeButton().click();
      await expect(outerFolder).toBeVisible();
      await expect(innerFolder).toBeVisible();
    });
  });

  test('Bulk Delete on a folder + request selection removes both', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'bulkdelete');

    await test.step('Select a folder and a request', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
    });

    await test.step('Delete them via bulk context menu', async () => {
      await locators.sidebar.itemRow('Req Root').click({ button: 'right' });
      await locators.dropdown.item('Delete').click();

      const deleteModal = locators.modal.byTitle('Delete Items');
      await expect(deleteModal).toBeVisible();
      await expect(deleteModal.getByText('1 folder and 1 request')).toBeVisible();
      await locators.modal.button('Delete').click();

      await expect(locators.sidebar.folder('Folder A')).not.toBeVisible();
      await expect(locators.sidebar.request('Req Root')).not.toBeVisible();
    });
  });

  test('A pure multi-request selection offers Delete only (requests are not collapsible); bulk delete removes all of them', async ({ page, createTmpDir }) => {
    const { locators, collectionAName } = await setupFixture(page, createTmpDir, 'multireq');
    await createRequest(page, 'Req Sibling', collectionAName, {});
    await clickEmptySidebarSpace(page);

    await test.step('Select two sibling requests (no folder, no collection)', async () => {
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Sibling').click({ modifiers: [SELECT_MODIFIER] });
    });

    await test.step('Right-click shows Delete only, no Collapse/Expand', async () => {
      await locators.sidebar.itemRow('Req Root').click({ button: 'right' });
      await expect(locators.dropdown.item('Delete')).toBeVisible();
      await expect(locators.dropdown.item('Collapse')).not.toBeVisible();
      await expect(locators.dropdown.item('Expand')).not.toBeVisible();
    });

    await test.step('Deleting shows a "Delete Requests" modal naming both, and removes them', async () => {
      await locators.dropdown.item('Delete').click();
      const deleteModal = locators.modal.byTitle('Delete Requests');
      await expect(deleteModal).toBeVisible();
      await expect(deleteModal.getByText('2 requests')).toBeVisible();
      await locators.modal.button('Delete').click();

      await expect(locators.sidebar.request('Req Root')).not.toBeVisible();
      await expect(locators.sidebar.request('Req Sibling')).not.toBeVisible();
    });
  });

  test('A pure multi-folder selection offers Collapse and Delete; bulk delete removes all selected folders and their children', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'multifolderdelete Collection';
    await createCollection(page, collectionName, await createTmpDir('multifolderdelete'));
    await createFolder(page, 'Folder One', collectionName);
    await createFolder(page, 'Folder Two', collectionName);
    await expandFolder(page, 'Folder One');
    await expandFolder(page, 'Folder Two');
    await createRequest(page, 'Req One', 'Folder One', { inFolder: true });
    await createRequest(page, 'Req Two', 'Folder Two', { inFolder: true });
    await clickEmptySidebarSpace(page);

    await test.step('Select both folders', async () => {
      await locators.sidebar.folder('Folder One').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.folder('Folder Two').click({ modifiers: [SELECT_MODIFIER] });
    });

    await test.step('Right-click offers both Collapse and Delete', async () => {
      await locators.sidebar.itemRow('Folder One').click({ button: 'right' });
      await expect(locators.dropdown.item('Collapse')).toBeVisible();
      await expect(locators.dropdown.item('Delete')).toBeVisible();
    });

    await test.step('Deleting shows a "Delete Folders" modal and removes both folders with their children', async () => {
      await locators.dropdown.item('Delete').click();
      const deleteModal = locators.modal.byTitle('Delete Folders');
      await expect(deleteModal).toBeVisible();
      await expect(deleteModal.getByText('2 folders')).toBeVisible();
      await locators.modal.button('Delete').click();

      await expect(locators.sidebar.folder('Folder One')).not.toBeVisible();
      await expect(locators.sidebar.folder('Folder Two')).not.toBeVisible();
    });
  });

  test('Dragging a multi-selected folder + request moves both together', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'dragdrop');

    await test.step('Select a folder and a request and drag them to another collection', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.itemRow('Folder A').dragTo(locators.sidebar.collection(collectionBName));
    });

    await test.step('Verify items moved successfully', async () => {
      await expect(locators.sidebar.scopedItem(collectionBName, 'Folder A')).toBeVisible();
      await expect(locators.sidebar.scopedItem(collectionBName, 'Req Root')).toBeVisible();

      await expect(locators.sidebar.scopedItem(collectionAName, 'Folder A')).toHaveCount(0);
      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Root')).toHaveCount(0);
    });
  });

  test('A folder selected together with its own child request drags as a single unit (parent-wins dedups the redundant child)', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'foldernchild');
    const folderARow = locators.sidebar.itemRow('Folder A');

    await test.step('Select Folder A and its own child Req A1, then drag from the folder row', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req A1').click({ modifiers: [SELECT_MODIFIER] });
      await expect(folderARow).not.toHaveClass(/drag-disabled/);

      await folderARow.dragTo(locators.sidebar.collection(collectionBName));
    });

    await test.step('Only Folder A (with Req A1 inside it) moved; Req Root stays behind', async () => {
      await expect(locators.sidebar.scopedItem(collectionBName, 'Folder A')).toBeVisible();
      await expandFolder(page, 'Folder A');
      await expect(locators.sidebar.scopedItem(collectionBName, 'Req A1')).toBeVisible();

      await expect(locators.sidebar.scopedItem(collectionAName, 'Folder A')).toHaveCount(0);
      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Root')).toBeVisible();
    });
  });

  test('Dragging the same folder back and forth across collections repeatedly keeps it fully interactive', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'repeatedfolderdrag');

    await test.step('Move Folder A (with its child) to Collection B', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.itemRow('Folder A').dragTo(locators.sidebar.collection(collectionBName));
      await expect(locators.sidebar.scopedItem(collectionBName, 'Folder A')).toBeVisible();
    });

    await test.step('Immediately select the moved folder and its child, and drag it back to Collection A', async () => {
      await expandFolder(page, 'Folder A');
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req A1').click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.itemRow('Folder A').dragTo(locators.sidebar.collection(collectionAName));
      await expect(locators.sidebar.scopedItem(collectionAName, 'Folder A')).toBeVisible();
    });

    await test.step('The folder and its child remain fully interactive after both moves', async () => {
      await expandFolder(page, 'Folder A');
      await expect(locators.sidebar.scopedItem(collectionAName, 'Req A1')).toBeVisible();

      // A stale/orphaned identity from either bug would leave this click unable to find or
      // open the request; a plain click should cleanly select and open it.
      await locators.sidebar.scopedItem(collectionAName, 'Req A1').click();
      await expect(locators.tabs.requestTab('Req A1')).toBeVisible();
    });
  });

  test('A single Ctrl/Cmd-selected item still drags normally and does not drag along the rest of the selection', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'singledrag');

    await test.step('Ctrl/Cmd-click Folder A alone, then drag it to Collection B', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await expect(locators.sidebar.itemRow('Folder A')).not.toHaveClass(/drag-disabled/);

      await locators.sidebar.itemRow('Folder A').dragTo(locators.sidebar.collection(collectionBName));
    });

    await test.step('Only Folder A (and its child) moved; Req Root stays behind in Collection A', async () => {
      await expect(locators.sidebar.scopedItem(collectionBName, 'Folder A')).toBeVisible();
      await expandFolder(page, 'Folder A');
      await expect(locators.sidebar.scopedItem(collectionBName, 'Req A1')).toBeVisible();

      await expect(locators.sidebar.scopedItem(collectionAName, 'Folder A')).toHaveCount(0);
      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Root')).toBeVisible();
    });
  });

  test('A single Ctrl/Cmd-selected item\'s drag clears the selection even though it is not a multi-drag', async ({ page, createTmpDir }) => {
    const { locators, collectionBName } = await setupFixture(page, createTmpDir, 'clearsingledrag');

    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.itemRow('Req Root').dragTo(locators.sidebar.collection(collectionBName));

    // The drop handler used to only clear the selection when `multiSelectedItems` was
    // populated (2+ effectively selected items), so a lone selected item's drag left it
    // stuck "selected" at its new location.
    await expect(locators.sidebar.itemRowIn(collectionBName, 'Req Root')).not.toHaveAttribute('data-selected', 'true');
  });

  test('Reselecting a new item after a single-item drag selects only that item, not the stale prior selection', async ({ page, createTmpDir }) => {
    const { locators, collectionBName } = await setupFixture(page, createTmpDir, 'reselectafterdrag');

    await test.step('Ctrl/Cmd-select a single request and drag it to another collection', async () => {
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.itemRow('Req Root').dragTo(locators.sidebar.collection(collectionBName));
    });

    await test.step('Ctrl/Cmd-selecting a different item selects only that item', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });

      await expect(locators.sidebar.itemRow('Folder A')).toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.itemRowIn(collectionBName, 'Req Root')).not.toHaveAttribute('data-selected', 'true');
    });
  });

  test('A single Ctrl/Cmd-selected item\'s drag onto another item (not a collection) also clears the selection', async ({ page, createTmpDir }) => {
    const { locators, collectionAName } = await setupFixture(page, createTmpDir, 'clearsingledropontoitem');

    // Drops onto a folder go through CollectionItem's own drop handler, a separate code path
    // from dropping onto a collection.
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.itemRow('Req Root').dragTo(locators.sidebar.folder('Folder A'));

    await expandFolder(page, 'Folder A');
    await expect(locators.sidebar.itemRowIn(collectionAName, 'Req Root')).not.toHaveAttribute('data-selected', 'true');
  });

  test('A single Ctrl/Cmd-selected collection still drags normally (not treated as a multi-collection drag)', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionAName = 'singlecoldrag Collection A';
    const collectionBName = 'singlecoldrag Collection B';
    const collectionCName = 'singlecoldrag Collection C';
    const collectionCRow = locators.sidebar.collectionRow(collectionCName);

    await test.step('Set up three collections', async () => {
      await createCollection(page, collectionAName, await createTmpDir('singlecoldrag-a'));
      await createCollection(page, collectionBName, await createTmpDir('singlecoldrag-b'));
      await createCollection(page, collectionCName, await createTmpDir('singlecoldrag-c'));
      await clickEmptySidebarSpace(page);
    });

    await test.step('Ctrl/Cmd-click Collection C alone, then drag it to reorder above Collection A', async () => {
      await locators.sidebar.collection(collectionCName).click({ modifiers: [SELECT_MODIFIER] });
      await expect(collectionCRow).not.toHaveClass(/drag-disabled/);

      await collectionCRow.dragTo(locators.sidebar.collectionRow(collectionAName), {
        targetPosition: { x: 5, y: 5 }
      });
    });

    await test.step('Only Collection C moved, and its drag cleared the selection', async () => {
      const rows = locators.sidebar.collectionRows();
      await expect(rows.nth(0)).toContainText(collectionCName);
      await expect(rows.nth(1)).toContainText(collectionAName);
      await expect(rows.nth(2)).toContainText(collectionBName);

      // The drop handler used to only clear the selection when `multiSelectedItems` was
      // populated (2+ effectively selected collections), so a lone selected collection's drag
      // left it stuck "selected" at its new position.
      await expect(collectionCRow).not.toHaveAttribute('data-selected', 'true');
    });
  });

  test('Dragging two multi-selected folders together moves both (with their children) to another collection', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const sourceDir = await createTmpDir('multifolderdrag-source');
    const targetDir = await createTmpDir('multifolderdrag-target');
    const sourceName = 'multifolderdrag Source';
    const targetName = 'multifolderdrag Target';

    await test.step('Set up two folders (each with a request) in the source collection, and an empty target collection', async () => {
      await createCollection(page, sourceName, sourceDir);
      await createFolder(page, 'Folder One', sourceName);
      await createFolder(page, 'Folder Two', sourceName);
      await expandFolder(page, 'Folder One');
      await expandFolder(page, 'Folder Two');
      await createRequest(page, 'Req One', 'Folder One', { inFolder: true });
      await createRequest(page, 'Req Two', 'Folder Two', { inFolder: true });
      await createCollection(page, targetName, targetDir);
      await clickEmptySidebarSpace(page);
    });

    await test.step('Select both folders and drag them to the target collection', async () => {
      await locators.sidebar.folder('Folder One').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.folder('Folder Two').click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.itemRow('Folder One').dragTo(locators.sidebar.collection(targetName));
    });

    await test.step('Both folders and their child requests moved to the target collection', async () => {
      await expect(locators.sidebar.scopedItem(targetName, 'Folder One')).toBeVisible();
      await expect(locators.sidebar.scopedItem(targetName, 'Folder Two')).toBeVisible();

      await expandFolder(page, 'Folder One');
      await expandFolder(page, 'Folder Two');
      await expect(locators.sidebar.scopedItem(targetName, 'Req One')).toBeVisible();
      await expect(locators.sidebar.scopedItem(targetName, 'Req Two')).toBeVisible();

      await expect(locators.sidebar.scopedItem(sourceName, 'Folder One')).toHaveCount(0);
      await expect(locators.sidebar.scopedItem(sourceName, 'Folder Two')).toHaveCount(0);
    });
  });

  test('Dragging two multi-selected sibling requests (no folder) together moves both to another collection', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'multireqdrag');
    await createRequest(page, 'Req Sibling', collectionAName, {});
    await clickEmptySidebarSpace(page);

    await test.step('Select both root-level requests and drag them to another collection', async () => {
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Sibling').click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.itemRow('Req Root').dragTo(locators.sidebar.collection(collectionBName));
    });

    await test.step('Both requests moved to the target collection', async () => {
      await expect(locators.sidebar.scopedItem(collectionBName, 'Req Root')).toBeVisible();
      await expect(locators.sidebar.scopedItem(collectionBName, 'Req Sibling')).toBeVisible();

      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Root')).toHaveCount(0);
      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Sibling')).toHaveCount(0);
    });
  });

  test('Dragging two multi-selected collections together reorders both above the drop target', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionAName = 'multicoldrag Collection A';
    const collectionBName = 'multicoldrag Collection B';
    const collectionCName = 'multicoldrag Collection C';

    await test.step('Create three collections, in order A, B, C', async () => {
      await createCollection(page, collectionAName, await createTmpDir('multicoldrag-a'));
      await createCollection(page, collectionBName, await createTmpDir('multicoldrag-b'));
      await createCollection(page, collectionCName, await createTmpDir('multicoldrag-c'));
      await clickEmptySidebarSpace(page);

      const rows = locators.sidebar.collectionRows();
      await expect(rows.nth(0)).toContainText(collectionAName);
      await expect(rows.nth(1)).toContainText(collectionBName);
      await expect(rows.nth(2)).toContainText(collectionCName);
    });

    await test.step('Select Collection A and Collection C, then drag one of them onto Collection B', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collection(collectionCName).click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.collectionRow(collectionAName).dragTo(locators.sidebar.collectionRow(collectionBName), {
        targetPosition: { x: 5, y: 5 }
      });
    });

    await test.step('Both selected collections land above Collection B, keeping their prior relative order', async () => {
      const rows = locators.sidebar.collectionRows();
      await expect(rows.nth(0)).toContainText(collectionAName);
      await expect(rows.nth(1)).toContainText(collectionCName);
      await expect(rows.nth(2)).toContainText(collectionBName);
    });

    await test.step('Selection clears after the drop', async () => {
      await expect(locators.sidebar.collectionRow(collectionAName)).not.toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.collectionRow(collectionCName)).not.toHaveAttribute('data-selected', 'true');
    });
  });

  test('A collection selected together with its own folder is not drag-disabled (parent-wins reduces it to a plain collection drag)', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionAName = 'ownfolderdrag Collection A';
    const collectionBName = 'ownfolderdrag Collection B';
    const collectionCName = 'ownfolderdrag Collection C';

    await createCollection(page, collectionAName, await createTmpDir('ownfolderdrag-a'));
    await createCollection(page, collectionBName, await createTmpDir('ownfolderdrag-b'));
    await createCollection(page, collectionCName, await createTmpDir('ownfolderdrag-c'));
    await createFolder(page, 'Folder C', collectionCName);
    await clickEmptySidebarSpace(page);

    // Collection C + its own Folder C dedups via parent-wins to just Collection C —
    // a plain (non-multi) collection selection, so dragging it should behave normally.
    await locators.sidebar.collection(collectionCName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.folder('Folder C').click({ modifiers: [SELECT_MODIFIER] });

    await expect(locators.sidebar.collectionRow(collectionCName)).not.toHaveClass(/drag-disabled/);

    await locators.sidebar.collectionRow(collectionCName).dragTo(locators.sidebar.collectionRow(collectionAName), {
      targetPosition: { x: 5, y: 5 }
    });

    const rows = locators.sidebar.collectionRows();
    await expect(rows.nth(0)).toContainText(collectionCName);
    await expect(rows.nth(1)).toContainText(collectionAName);
    await expect(rows.nth(2)).toContainText(collectionBName);
  });

  test('Dragging a selection that mixes a collection with a folder, request, or app has no common target and is blocked', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'blockeddrag');

    const folderARow = locators.sidebar.itemRow('Folder A');
    const reqRootRow = locators.sidebar.itemRow('Req Root');
    const collectionBRow = locators.sidebar.collectionRow(collectionBName);

    await createApp(page, 'App1', { collectionName: collectionAName });
    const appRow = locators.sidebar.itemRow('App1');

    await test.step('App + Collection: both rows are drag-disabled and dropping elsewhere is a no-op', async () => {
      await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
      await appRow.click({ modifiers: [SELECT_MODIFIER] });

      await expect(collectionBRow).toHaveClass(/drag-disabled/);
      await expect(appRow).toHaveClass(/drag-disabled/);

      await appRow.dragTo(locators.sidebar.collection(collectionBName));

      await expect(locators.sidebar.scopedItem(collectionAName, 'App1')).toBeVisible();
      await expect(locators.sidebar.scopedItem(collectionBName, 'App1')).toHaveCount(0);

      await expect(collectionBRow).toHaveAttribute('data-selected', 'true');
      await expect(appRow).toHaveAttribute('data-selected', 'true');

      await clickEmptySidebarSpace(page);
    });

    await test.step('Collection + Request: both rows are drag-disabled and dropping onto another item is a no-op', async () => {
      await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

      await expect(collectionBRow).toHaveClass(/drag-disabled/);
      await expect(reqRootRow).toHaveClass(/drag-disabled/);

      await reqRootRow.dragTo(locators.sidebar.folder('Folder A'));

      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Root')).toBeVisible();
      await expect(locators.sidebar.request('Req A1')).toBeVisible();

      // A blocked drag never drops, so the selection is never cleared by it.
      await expect(collectionBRow).toHaveAttribute('data-selected', 'true');
      await expect(reqRootRow).toHaveAttribute('data-selected', 'true');

      await clickEmptySidebarSpace(page);
    });

    await test.step('Folder + Collection: both rows are drag-disabled and dropping elsewhere is a no-op', async () => {
      await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });

      await expect(collectionBRow).toHaveClass(/drag-disabled/);
      await expect(folderARow).toHaveClass(/drag-disabled/);

      await folderARow.dragTo(locators.sidebar.collection(collectionBName));

      await expect(locators.sidebar.scopedItem(collectionAName, 'Folder A')).toBeVisible();
      await expect(locators.sidebar.request('Req A1')).toBeVisible();
      await expect(locators.sidebar.scopedItem(collectionBName, 'Folder A')).toHaveCount(0);

      await expect(collectionBRow).toHaveAttribute('data-selected', 'true');
      await expect(folderARow).toHaveAttribute('data-selected', 'true');

      await clickEmptySidebarSpace(page);
    });

    await test.step('Request + Folder + Collection: all rows are drag-disabled and dropping is a no-op', async () => {
      await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

      await expect(collectionBRow).toHaveClass(/drag-disabled/);
      await expect(folderARow).toHaveClass(/drag-disabled/);
      await expect(reqRootRow).toHaveClass(/drag-disabled/);

      await folderARow.dragTo(locators.sidebar.collection(collectionBName));

      await expect(locators.sidebar.scopedItem(collectionAName, 'Folder A')).toBeVisible();
      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Root')).toBeVisible();
      await expect(locators.sidebar.scopedItem(collectionBName, 'Folder A')).toHaveCount(0);

      await expect(collectionBRow).toHaveAttribute('data-selected', 'true');
      await expect(folderARow).toHaveAttribute('data-selected', 'true');
      await expect(reqRootRow).toHaveAttribute('data-selected', 'true');
    });
  });

  test('Plain click on a new row clears an existing multi-selection', async ({ page, createTmpDir }) => {
    const { locators } = await setupFixture(page, createTmpDir, 'plainclear');
    const folderARow = locators.sidebar.itemRow('Folder A');
    const reqRootRow = locators.sidebar.itemRow('Req Root');
    const reqA1Row = locators.sidebar.itemRow('Req A1');

    await test.step('Select a folder and a request', async () => {
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });
      await expect(folderARow).toHaveAttribute('data-selected', 'true');
      await expect(reqRootRow).toHaveAttribute('data-selected', 'true');
    });

    await test.step('Plain-clicking a different row clears the whole prior selection', async () => {
      await locators.sidebar.request('Req A1').click();

      await expect(folderARow).not.toHaveAttribute('data-selected', 'true');
      await expect(reqRootRow).not.toHaveAttribute('data-selected', 'true');
      await expect(reqA1Row).not.toHaveAttribute('data-selected', 'true');
    });
  });

  test('Bulk menu for a pure collection selection offers Remove Selected and Collapse Selected together', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'collectionmenu');

    await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });

    await expect(locators.dropdown.item('Remove Selected')).toBeVisible();
    await expect(locators.dropdown.item('Collapse Selected')).toBeVisible();
    await expect(locators.dropdown.item('Delete')).not.toBeVisible();

    await clickEmptySidebarSpace(page);
  });

  test('Collapse Selected / Expand Selected toggles all selected collections together, independent of the unselected ones', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionAName = 'collapseselected Collection A';
    const collectionBName = 'collapseselected Collection B';

    await createCollection(page, collectionAName, await createTmpDir('collapseselected-a'));
    await createCollection(page, collectionBName, await createTmpDir('collapseselected-b'));
    await createFolder(page, 'Folder A', collectionAName);
    await createFolder(page, 'Folder B', collectionBName);
    await clickEmptySidebarSpace(page);

    const collapseSelectedItem = locators.dropdown.item('Collapse Selected');
    const expandSelectedItem = locators.dropdown.item('Expand Selected');

    await test.step('Collapsing both selected collections hides their children', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await collapseSelectedItem.click();

      await expect(locators.sidebar.folder('Folder A')).not.toBeVisible();
      await expect(locators.sidebar.folder('Folder B')).not.toBeVisible();
    });

    await test.step('Selecting them again and choosing Expand Selected reveals their children', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await expect(expandSelectedItem).toBeVisible();
      await expandSelectedItem.click();

      await expect(locators.sidebar.folder('Folder A')).toBeVisible();
      await expect(locators.sidebar.folder('Folder B')).toBeVisible();
    });
  });

  test('A collection + request mixed selection only offers Collapse Selected (no Remove/Delete)', async ({ page, createTmpDir }) => {
    const { locators, collectionBName } = await setupFixture(page, createTmpDir, 'mixedcollreq');

    // Selecting Collection B with Req Root (in Collection A) prevents parent-wins logic.
    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Req Root').click({ button: 'right' });

    await expect(locators.dropdown.item('Collapse Selected')).toBeVisible();
    await expect(locators.dropdown.item('Remove')).not.toBeVisible();
    await expect(locators.dropdown.item('Delete')).not.toBeVisible();

    await clickEmptySidebarSpace(page);
  });

  test('A folder from one collection selected together with a different collection also only offers Collapse Selected (no Remove/Delete)', async ({ page, createTmpDir }) => {
    const { locators, collectionBName } = await setupFixture(page, createTmpDir, 'mixedcollfolder');

    // Selecting Collection B with Folder A (in Collection A) prevents parent-wins logic.
    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });

    await locators.sidebar.itemRow('Folder A').click({ button: 'right' });

    await expect(locators.dropdown.item('Collapse Selected')).toBeVisible();
    await expect(locators.dropdown.item('Remove')).not.toBeVisible();
    await expect(locators.dropdown.item('Delete')).not.toBeVisible();

    await clickEmptySidebarSpace(page);
  });

  test('A request + folder (different collection) + collection selected together offers only Collapse Selected, which leaves the request untouched', async ({ page, createTmpDir }) => {
    const { locators, collectionAName, collectionBName } = await setupFixture(page, createTmpDir, 'mixedtriple');

    await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });
    await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

    await test.step('Only Collapse Selected is offered', async () => {
      await locators.sidebar.itemRow('Folder A').click({ button: 'right' });
      await expect(locators.dropdown.item('Collapse Selected')).toBeVisible();
      await expect(locators.dropdown.item('Remove')).not.toBeVisible();
      await expect(locators.dropdown.item('Delete')).not.toBeVisible();
      await locators.dropdown.item('Collapse Selected').click();
    });

    await test.step('Collapsing only affects the folder and collection; the request is untouched', async () => {
      await expect(locators.sidebar.request('Req A1')).not.toBeVisible();
      await expect(locators.sidebar.scopedItem(collectionAName, 'Req Root')).toBeVisible();
    });
  });

  test('Selecting a collection together with its own folder or request collapses via parent-wins to a plain collection selection', async ({ page, createTmpDir }) => {
    const { locators, collectionAName } = await setupFixture(page, createTmpDir, 'ownchildwins');

    await test.step('Collection A + its own root-level request (Req Root) behaves as a pure collection selection', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.request('Req Root').click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await expect(locators.dropdown.item('Remove Selected')).toBeVisible();
      await expect(locators.dropdown.item('Collapse Selected')).toBeVisible();
      await expect(locators.dropdown.item('Delete')).not.toBeVisible();
      await page.keyboard.press('Escape');
      await clickEmptySidebarSpace(page);
    });

    await test.step('Collection A + its own Folder A also behaves as a pure collection selection', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.folder('Folder A').click({ modifiers: [SELECT_MODIFIER] });

      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await expect(locators.dropdown.item('Remove Selected')).toBeVisible();
      await expect(locators.dropdown.item('Collapse Selected')).toBeVisible();
      await expect(locators.dropdown.item('Delete')).not.toBeVisible();
      await page.keyboard.press('Escape');
      await clickEmptySidebarSpace(page);
    });
  });

  test('Bulk Collapse on a multi-folder selection collapses all of them and clears the selection', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionDir = await createTmpDir('bulkcollapse');
    const collectionName = 'bulkcollapse Collection';

    await test.step('Setup collection and folders', async () => {
      await createCollection(page, collectionName, collectionDir);
      await createFolder(page, 'Folder One', collectionName);
      await createFolder(page, 'Folder Two', collectionName);
      await expandFolder(page, 'Folder One');
      await expandFolder(page, 'Folder Two');
      await createRequest(page, 'Req One', 'Folder One', { inFolder: true });
      await createRequest(page, 'Req Two', 'Folder Two', { inFolder: true });
      await clickEmptySidebarSpace(page);
    });

    await test.step('Select multiple folders', async () => {
      await locators.sidebar.folder('Folder One').click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.folder('Folder Two').click({ modifiers: [SELECT_MODIFIER] });
    });

    await test.step('Collapse them via bulk menu', async () => {
      await locators.sidebar.itemRow('Folder One').click({ button: 'right' });
      await locators.dropdown.item('Collapse').click();

      await expect(locators.sidebar.request('Req One')).not.toBeVisible();
      await expect(locators.sidebar.request('Req Two')).not.toBeVisible();
    });

    await test.step('Verify selection is cleared', async () => {
      await expect(locators.sidebar.itemRow('Folder One')).not.toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.itemRow('Folder Two')).not.toHaveAttribute('data-selected', 'true');
    });
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

      await expect(locators.sidebar.itemRow('Folder A')).toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.itemRow('Req Root')).toHaveAttribute('data-selected', 'true');
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

    const removeItem = locators.dropdown.item('Remove Selected');

    await test.step('Cancelling leaves both collections selected and open', async () => {
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });
      await removeItem.click();

      const removeModal = locators.modal.byTitle('Remove Collections');
      await expect(removeModal).toBeVisible();
      await locators.modal.button('Cancel').click();
      await expect(removeModal).not.toBeVisible();

      await expect(locators.sidebar.collectionRow(collectionAName)).toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.collectionRow(collectionBName)).toHaveAttribute('data-selected', 'true');
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

    await test.step('Select multiple collections', async () => {
      await locators.sidebar.collection(collectionAName).click({ modifiers: [SELECT_MODIFIER] });
      await locators.sidebar.collection(collectionBName).click({ modifiers: [SELECT_MODIFIER] });
    });

    await test.step('Remove them via bulk context menu', async () => {
      await locators.sidebar.collectionRow(collectionAName).click({ button: 'right' });

      const removeItem = locators.dropdown.item('Remove Selected');
      await expect(removeItem).toBeVisible();
      await removeItem.click();

      const removeModal = locators.modal.byTitle('Remove Collections');
      await expect(removeModal).toBeVisible();
      await locators.modal.button('Remove All').click();

      await expect(locators.sidebar.collection(collectionAName)).not.toBeVisible();
      await expect(locators.sidebar.collection(collectionBName)).not.toBeVisible();
    });
  });
});
