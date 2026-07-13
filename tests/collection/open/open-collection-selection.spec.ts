import { test, expect, ElectronApplication, Page } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { buildCommonLocators, closeAllCollections } from '../../utils/page';

const writeCollection = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opencollection.yml'), `opencollection: "1.0.0"\ninfo:\n  name: ${name}\n`);
};

const writeBrunoJsonCollection = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'bruno.json'),
    JSON.stringify({ version: '1', name, type: 'collection' }, null, 2)
  );
};

const writeInvalidCollection = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opencollection.yml'), 'opencollection: "1.0.0"\ninfo: {name:');
};

const mockPickerPaths = async (electronApp: ElectronApplication, filePaths: string[]) => {
  await electronApp.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths });
  }, filePaths);
};

const mockPickerCancelWithFlag = async (electronApp: ElectronApplication) => {
  await electronApp.evaluate(({ dialog }) => {
    (global as any).__pickerOpened = false;
    dialog.showOpenDialog = async () => {
      (global as any).__pickerOpened = true;
      return { canceled: true, filePaths: [] };
    };
  });
};

const wasPickerOpened = (electronApp: ElectronApplication): Promise<boolean> =>
  electronApp.evaluate(() => (global as any).__pickerOpened);

const openViaSidebar = async (page: Page) => {
  const { plusMenu, dropdown } = buildCommonLocators(page);
  await plusMenu.button().click();
  await dropdown.tippyItem('Open collection').click();
};

const openCollectionModal = (page: Page) => buildCommonLocators(page).modal.byTitle('Open Collection');

const listTitles = (page: Page) => page.locator('[data-testid="selection-list"] .selection-item-title');

const closeModal = async (page: Page) => {
  await buildCommonLocators(page).modal.closeButton().click();
  await expect(openCollectionModal(page)).toHaveCount(0);
};

test.describe('Open Collection - selection flow', () => {
  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      (global as any).__origShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (global as any).__origShowOpenDialog;
    });
  });

  test('opens a single picked collection directly, with no modal', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const dir = await createTmpDir('single-direct');
    writeCollection(dir, 'Single Collection');

    await mockPickerPaths(electronApp, [dir]);
    await openViaSidebar(page);

    await expect(locators.sidebar.collection('Single Collection')).toBeVisible();
    await expect(openCollectionModal(page)).toHaveCount(0);
    await closeAllCollections(page);
  });

  test('opens a bruno.json collection directly', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const dir = await createTmpDir('bruno-json');
    writeBrunoJsonCollection(dir, 'Bruno JSON Collection');

    await mockPickerPaths(electronApp, [dir]);
    await openViaSidebar(page);

    await expect(locators.sidebar.collection('Bruno JSON Collection')).toBeVisible();
    await expect(openCollectionModal(page)).toHaveCount(0);
    await closeAllCollections(page);
  });

  test('shows the selection modal for a nested bruno.json collection', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const base = await createTmpDir('nested-bruno-json');
    writeBrunoJsonCollection(path.join(base, 'nested'), 'Nested JSON Collection');

    await mockPickerPaths(electronApp, [base]);
    await openViaSidebar(page);

    await expect(openCollectionModal(page)).toBeVisible();
    await expect(listTitles(page)).toHaveText('Nested JSON Collection');

    await locators.modal.button('Open').click();

    await expect(locators.sidebar.collection('Nested JSON Collection')).toBeVisible();
    await closeAllCollections(page);
  });

  test('opens multiple picked collections directly when each folder is a collection', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const dir1 = await createTmpDir('direct-1');
    const dir2 = await createTmpDir('direct-2');
    writeCollection(dir1, 'Direct One');
    writeCollection(dir2, 'Direct Two');

    await mockPickerPaths(electronApp, [dir1, dir2]);
    await openViaSidebar(page);

    await expect(locators.sidebar.collection('Direct One')).toBeVisible();
    await expect(locators.sidebar.collection('Direct Two')).toBeVisible();
    await expect(openCollectionModal(page)).toHaveCount(0);
    await closeAllCollections(page);
  });

  test('shows the selection modal for nested collections, preselected, and opens all', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const base = await createTmpDir('multi-nested');
    writeCollection(path.join(base, 'alpha'), 'Alpha Collection');
    writeCollection(path.join(base, 'beta'), 'Beta Collection');

    await mockPickerPaths(electronApp, [base]);
    await openViaSidebar(page);

    await expect(openCollectionModal(page)).toBeVisible();
    await expect(page.getByTestId('selection-count')).toHaveText('2');
    await expect(listTitles(page)).toHaveCount(2);
    // Everything found is preselected.
    await expect(locators.modal.footer()).toContainText('2 of 2 selected');

    await locators.modal.button('Open').click();

    await expect(locators.sidebar.collection('Alpha Collection')).toBeVisible();
    await expect(locators.sidebar.collection('Beta Collection')).toBeVisible();
    await closeAllCollections(page);
  });

  test('opens only the selected subset after deselecting one', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const base = await createTmpDir('subset-nested');
    writeCollection(path.join(base, 'keep'), 'Keep Collection');
    writeCollection(path.join(base, 'drop'), 'Drop Collection');

    await mockPickerPaths(electronApp, [base]);
    await openViaSidebar(page);

    await expect(openCollectionModal(page)).toBeVisible();

    // Uncheck the "Drop" collection.
    await openCollectionModal(page)
      .locator('[data-testid="selection-list"] li')
      .filter({ hasText: 'Drop Collection' })
      .getByRole('checkbox')
      .click();
    await expect(locators.modal.footer()).toContainText('1 of 2 selected');

    await locators.modal.button('Open').click();

    await expect(locators.sidebar.collection('Keep Collection')).toBeVisible();
    await expect(locators.sidebar.collection('Drop Collection')).toHaveCount(0);
    await closeAllCollections(page);
  });

  test('select-all toggle clears the selection and disables Open', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const base = await createTmpDir('select-all');
    writeCollection(path.join(base, 'one'), 'One Collection');
    writeCollection(path.join(base, 'two'), 'Two Collection');

    await mockPickerPaths(electronApp, [base]);
    await openViaSidebar(page);

    await expect(openCollectionModal(page)).toBeVisible();

    const openButton = locators.modal.button('Open');
    const selectAll = page.getByTestId('selection-select-all-toggle').getByRole('checkbox');

    await selectAll.click();
    await expect(locators.modal.footer()).toContainText('0 of 2 selected');
    await expect(openButton).toBeDisabled();

    await selectAll.click();
    await expect(locators.modal.footer()).toContainText('2 of 2 selected');
    await expect(openButton).toBeEnabled();

    await closeModal(page);
  });

  test('cancelling the picker shows no modal and no error toast', async ({ page, electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
    });

    await openViaSidebar(page);

    await expect(openCollectionModal(page)).toHaveCount(0);
    await expect(page.getByText('An error occurred while scanning for collections')).toHaveCount(0);
    await expect(page.getByText('No Bruno collections were found')).toHaveCount(0);
  });

  test('reports a toast when a folder has no collections', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const empty = await createTmpDir('no-collections');
    fs.writeFileSync(path.join(empty, 'readme.txt'), 'nothing here');

    await mockPickerPaths(electronApp, [empty]);
    await openViaSidebar(page);

    await expect(page.getByText('No Bruno collections were found.')).toBeVisible();
    await expect(openCollectionModal(page)).toHaveCount(0);
  });

  test('surfaces skipped or invalid collections while keeping valid ones selectable', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const base = await createTmpDir('with-skipped');
    writeCollection(path.join(base, 'good'), 'Good Nested');
    writeInvalidCollection(path.join(base, 'bad'));

    await mockPickerPaths(electronApp, [base]);
    await openViaSidebar(page);

    const modal = openCollectionModal(page);
    await expect(modal).toBeVisible();

    // Skipped-paths warning is shown for the invalid collection.
    await expect(modal.getByText(/were skipped because their config could not be read/)).toBeVisible();

    // The valid collection is still listed and preselected.
    await expect(page.getByTestId('selection-count')).toHaveText('1');
    await expect(listTitles(page)).toHaveText('Good Nested');

    await closeModal(page);
  });

  test('search narrows the list and shows a no matching collections found message', async ({ page, electronApp, createTmpDir }) => {
    const base = await createTmpDir('search-nested');
    writeCollection(path.join(base, 'payments'), 'Payments API');
    writeCollection(path.join(base, 'inventory'), 'Inventory API');

    await mockPickerPaths(electronApp, [base]);
    await openViaSidebar(page);

    const modal = openCollectionModal(page);
    await expect(modal).toBeVisible();
    await expect(listTitles(page)).toHaveCount(2);

    const search = page.getByTestId('selection-search-input');
    await search.fill('payments');
    await expect(listTitles(page)).toHaveText('Payments API');

    await search.fill('zzzzz');
    await expect(modal.getByText('No matching collections found')).toBeVisible();

    await closeModal(page);
  });

  test('reopening starts from fresh state', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const first = await createTmpDir('reopen-first');
    writeCollection(path.join(first, 'alpha'), 'Reopen Alpha');
    writeCollection(path.join(first, 'beta'), 'Reopen Beta');

    const second = await createTmpDir('reopen-second');
    writeCollection(path.join(second, 'gamma'), 'Reopen Gamma');
    writeCollection(path.join(second, 'delta'), 'Reopen Delta');

    // First open
    await mockPickerPaths(electronApp, [first]);
    await openViaSidebar(page);
    await expect(openCollectionModal(page)).toBeVisible();
    await openCollectionModal(page)
      .locator('[data-testid="selection-list"] li')
      .filter({ hasText: 'Reopen Alpha' })
      .getByRole('checkbox')
      .click();
    await expect(locators.modal.footer()).toContainText('1 of 2 selected');
    await closeModal(page);

    // Second open
    await mockPickerPaths(electronApp, [second]);
    await openViaSidebar(page);
    await expect(openCollectionModal(page)).toBeVisible();
    await expect(listTitles(page)).toHaveText(['Reopen Gamma', 'Reopen Delta']);
    await expect(locators.modal.footer()).toContainText('2 of 2 selected');

    await closeModal(page);
  });

  test('the sidebar empty state "Open" link opens the folder picker', async ({ page, electronApp }) => {
    await closeAllCollections(page);
    await mockPickerCancelWithFlag(electronApp);

    await expect(page.getByText('No collections found.')).toBeVisible();
    await page.getByText('Open', { exact: true }).click();

    await expect.poll(() => wasPickerOpened(electronApp)).toBe(true);
    await expect(openCollectionModal(page)).toHaveCount(0);
  });

  test('the workspace overview "Open Collection" button opens the folder picker', async ({ page, electronApp }) => {
    await mockPickerCancelWithFlag(electronApp);

    // Navigate to the workspace overview
    await page.locator('.titlebar-left .home-button').click();
    await page.getByRole('button', { name: 'Open Collection' }).click();

    await expect.poll(() => wasPickerOpened(electronApp)).toBe(true);
    await expect(openCollectionModal(page)).toHaveCount(0);
  });

  test('the native App menu entry opens the folder picker', async ({ page, electronApp }) => {
    await mockPickerCancelWithFlag(electronApp);

    // Simulate the OS-level "File > Open Collection" menu
    await electronApp.evaluate(({ ipcMain }) => {
      ipcMain.emit('menu:open-collection');
    });

    await expect.poll(() => wasPickerOpened(electronApp)).toBe(true);
    await expect(openCollectionModal(page)).toHaveCount(0);
  });
});
