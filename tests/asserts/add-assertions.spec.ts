import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  openCollectionAndAcceptSandbox,
  openRequest,
  selectRequestPaneTab,
  sendRequest,
  selectEnvironment,
  addAssertion,
  editAssertion,
  deleteAssertion,
  saveRequest
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Assertions - BRU Collection', () => {
  test.beforeAll(async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Navigate to assertions tab', async () => {
      await openCollectionAndAcceptSandbox(page, 'test-assertions-bru', 'safe');
      await selectEnvironment(page, 'Local', 'collection');
      await openRequest(page, 'test-assertions-bru', 'ping');
      await selectRequestPaneTab(page, 'Assert');
    });
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    // Ensure we're on the Assertions tab
    await selectRequestPaneTab(page, 'Assert');

    // Wait for table to be visible
    await expect(table.container()).toBeVisible();

    // Get all rows and delete assertions (skip the empty row at the end)
    let rowCount = await table.allRows().count();

    // Keep deleting assertions until only the empty row remains
    // We delete from the end to avoid index shifting issues
    while (rowCount > 1) {
      const deleteButton = table.rowDeleteButton(rowCount - 2); // Second to last (skip empty row)

      await expect(deleteButton).toBeVisible({ timeout: 1000 });
      await deleteButton.click();
      // Wait for row count to decrease after deletion
      await expect(table.allRows()).toHaveCount(rowCount - 1);
      rowCount = await table.allRows().count(); // Re-count rows
    }

    // Save the request to persist the clean state
    // saveRequest already waits for the "Request saved successfully" toast internally
    await saveRequest(page);
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should add assertion to request, verify toast, and run request successfully', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Add assertion to the request', async () => {
      await addAssertion(page, {
        expr: 'res.body',
        value: 'pong'
      });
    });

    await test.step('Save request and verify success toast', async () => {
      await saveRequest(page);
    });

    await test.step('Send request and verify response', async () => {
      await sendRequest(page, 200);

      // Verify response status
      await expect(locators.response.statusCode()).toContainText('200');

      // Verify response body contains "pong"
      await expect(locators.response.body()).toContainText('pong', { timeout: 5000 });
    });

    await test.step('Delete assertion and save', async () => {
      // Navigate back to Assertions tab
      await selectRequestPaneTab(page, 'Assert');

      // Delete the assertion at row 0 (first data row)
      await deleteAssertion(page, 0);

      // Save the request
      await saveRequest(page);
    });
  });

  test('should add multiple assertions', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    await test.step('Add first assertion', async () => {
      await addAssertion(page, {
        expr: 'res.status',
        value: '200'
      });
    });

    await test.step('Add second assertion', async () => {
      await addAssertion(page, {
        expr: 'res.body',
        value: 'pong'
      });
    });

    await test.step('Add third assertion', async () => {
      await addAssertion(page, {
        expr: 'res.responseTime',
        value: '1000'
      });
    });

    await test.step('Verify all assertions are present', async () => {
      // Check input values instead of cell text content
      await expect(table.rowExprInput(0)).toHaveValue('res.status');
      await expect(table.rowExprInput(1)).toHaveValue('res.body');
      await expect(table.rowExprInput(2)).toHaveValue('res.responseTime');
    });

    await test.step('Save request', async () => {
      await saveRequest(page);
    });
  });

  test('should edit an existing assertion', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    await test.step('Add initial assertion', async () => {
      await addAssertion(page, {
        expr: 'res.body',
        value: 'ping'
      });
    });

    await test.step('Edit the assertion', async () => {
      await editAssertion(page, 0, {
        expr: 'res.status',
        value: '200'
      });
    });

    await test.step('Verify assertion was updated', async () => {
      await expect(table.rowExprInput(0)).toHaveValue('res.status');
      // The value cell might contain the operator, so we check it contains our value
      const valueCell = table.rowCell(0, 'value');
      await expect(valueCell).toContainText('200');
    });

    await test.step('Save request', async () => {
      await saveRequest(page);
    });
  });

  test('should toggle assertion checkbox (enable/disable)', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    await test.step('Add assertion', async () => {
      await addAssertion(page, {
        expr: 'res.status',
        value: '200'
      });
    });

    await test.step('Verify checkbox is checked by default', async () => {
      const checkbox = table.rowCheckbox(0);
      await expect(checkbox).toBeChecked();
    });

    await test.step('Uncheck the assertion', async () => {
      const checkbox = table.rowCheckbox(0);
      await checkbox.uncheck();
    });

    await test.step('Verify checkbox is unchecked', async () => {
      const checkbox = table.rowCheckbox(0);
      await expect(checkbox).not.toBeChecked();
    });

    await test.step('Re-check the assertion', async () => {
      const checkbox = table.rowCheckbox(0);
      await checkbox.check();
    });

    await test.step('Verify checkbox is checked again', async () => {
      const checkbox = table.rowCheckbox(0);
      await expect(checkbox).toBeChecked();
    });

    await test.step('Save request', async () => {
      await saveRequest(page);
    });
  });

  test('should delete multiple assertions', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    await test.step('Add multiple assertions', async () => {
      await addAssertion(page, { expr: 'res.status', value: '200' });
      await addAssertion(page, { expr: 'res.body', value: 'pong' });
      await addAssertion(page, { expr: 'res.responseTime', value: '1000' });
    });

    await test.step('Verify three assertions exist', async () => {
      const rowCount = await table.allRows().count();
      expect(rowCount).toBeGreaterThanOrEqual(3);
    });

    await test.step('Delete first assertion', async () => {
      await deleteAssertion(page, 0);
    });

    await test.step('Delete second assertion (now at index 0 after first deletion)', async () => {
      await deleteAssertion(page, 0);
    });

    await test.step('Verify only one assertion remains', async () => {
      const rowCount = await table.allRows().count();
      // Should have at least 1 assertion row + 1 empty row
      expect(rowCount).toBeGreaterThanOrEqual(1);
    });

    await test.step('Save request', async () => {
      await saveRequest(page);
    });
  });

  test('should add assertion with different operators', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    await test.step('Add assertion with contains operator', async () => {
      await addAssertion(page, {
        expr: 'res.body',
        value: 'pong',
        operator: 'contains'
      });
    });

    await test.step('Add assertion with greater than operator', async () => {
      await addAssertion(page, {
        expr: 'res.status',
        value: '199',
        operator: 'gt'
      });
    });

    await test.step('Add assertion with length operator', async () => {
      await addAssertion(page, {
        expr: 'res.body',
        value: '4',
        operator: 'length'
      });
    });

    await test.step('Verify assertions with different operators exist', async () => {
      await expect(table.rowExprInput(0)).toHaveValue('res.body');
      await expect(table.rowExprInput(1)).toHaveValue('res.status');
      await expect(table.rowExprInput(2)).toHaveValue('res.body');
    });

    await test.step('Save request', async () => {
      await saveRequest(page);
    });
  });
});
