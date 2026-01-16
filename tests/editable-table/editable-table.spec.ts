import { test, expect } from '../../playwright';
import { createCollection, closeAllCollections, createRequest, selectRequestPaneTab } from '../utils/page';

test.describe('EditableTable - Focus and Placeholder', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Cursor focus restored after save and placeholder shown for empty value', async ({ page, createTmpDir }) => {
    const collectionName = 'test-editable-table';

    // Create a new collection
    await createCollection(page, collectionName, await createTmpDir());

    // Create a request
    await createRequest(page, 'Test Request', collectionName, {
      url: 'https://httpbin.org/get'
    });

    // Navigate to Params tab
    await selectRequestPaneTab(page, 'Params');

    // Find the Query params table
    const queryTable = page.locator('table').first();
    const firstRow = queryTable.locator('tbody tr').first();

    // Get the Name input (regular input)
    const nameInput = firstRow.locator('input[type="text"]').first();
    await nameInput.click();
    await page.keyboard.type('testParam');

    // Verify input has focus before save
    await expect(nameInput).toBeFocused();

    // Save the request
    await page.keyboard.press('Meta+s');

    // Wait for save toast
    await expect(page.getByText('Request saved successfully').last()).toBeVisible();

    // Verify cursor focus is restored after save
    await expect(nameInput).toBeFocused();

    // Verify placeholder shows for empty Value field
    const valueCell = firstRow.locator('[data-testid="column-value"]');
    const placeholder = valueCell.locator('pre.CodeMirror-placeholder');
    await expect(placeholder).toHaveText('Value');
  });
});
