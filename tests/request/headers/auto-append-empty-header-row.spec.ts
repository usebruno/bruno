import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  selectRequestPaneTab
} from '../../utils/page';

test.afterEach(async ({ page }) => {
  await closeAllCollections(page);
});

test('Auto-appends an empty header row when either Name or Value is filled', async ({ page, createTmpDir }) => {
  const collectionName = 'auto-append-empty-header-row';
  const locators = buildCommonLocators(page);

  await test.step('Create a collection', async () => {
    await createCollection(page, collectionName, await createTmpDir());
  });

  await test.step('Create folder-1 inside the collection', async () => {
    await createFolder(page, 'folder-1', collectionName, true);
    await locators.sidebar.folder('folder-1').dblclick();
  });

  await test.step('Create an HTTP request inside folder-1', async () => {
    await createRequest(page, 'request-1', 'folder-1', { url: 'https://example.com/api', inFolder: true });
    await selectRequestPaneTab(page, 'Headers');
  });

  const headersTable = page.locator('table').first();
  const rows = headersTable.locator('tbody tr');

  await test.step('Starts with a single empty header row', async () => {
    await expect(rows).toHaveCount(1);
  });

  await test.step('Typing into the Name field appends a new empty row', async () => {
    const nameEditor = rows.first().getByTestId('column-name').locator('.CodeMirror');
    await nameEditor.click();
    await page.keyboard.type('Content-Type');

    await expect(rows).toHaveCount(2);
  });

  await test.step('Typing only into the Value field (Name left empty) also appends a new empty row', async () => {
    const valueEditor = rows.nth(1).getByTestId('column-value').locator('.CodeMirror');
    await valueEditor.click();
    await page.keyboard.type('application/json');

    await expect(rows).toHaveCount(3);
  });

  const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

  await test.step('Clearing the Name field empties that row and removes it', async () => {
    // Row 0 has only a Name ("Content-Type"); clearing it makes the row fully
    // empty, so it is dropped and the trailing empty row remains.
    const nameEditor = rows.first().getByTestId('column-name').locator('.CodeMirror');
    await nameEditor.click();
    await page.keyboard.press(selectAll);
    await page.keyboard.press('Backspace');

    await expect(rows).toHaveCount(2);
  });

  await test.step('Clearing the Value field empties that row, leaving only the empty add row', async () => {
    // The Value-only row is now first; clearing its Value makes it fully empty,
    // so it is dropped and only the single trailing empty row is left.
    const valueEditor = rows.first().getByTestId('column-value').locator('.CodeMirror');
    await valueEditor.click();
    await page.keyboard.press(selectAll);
    await page.keyboard.press('Backspace');

    await expect(rows).toHaveCount(1);
  });
});
