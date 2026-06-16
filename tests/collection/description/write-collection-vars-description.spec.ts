import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';

test.describe('Collection Settings Descriptions - Write (Vars)', () => {
  test('writes a multiline description to a pre-request var and persists it to collection.bru', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    // Open collection settings
    await page
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'col-description' })
      .click();
    // The tab label always reads "Collection" regardless of the collection name
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    await page.locator('.tab.vars').click();

    // Wait for the pre-request vars table to render its rows
    await expect(page.locator('table:first-of-type tbody tr').first()).toBeVisible();

    // Find the 'plain' row by checking name input values, not by position.
    // Use CodeMirror's JS API so the `change` event fires synchronously and
    // the EditableTable onChange chain updates Redux state before we click Save.
    await page.evaluate(() => {
      const rows = document.querySelectorAll('table:first-of-type tbody tr');
      const targetRow = Array.from(rows).find((row) => {
        const input = row.querySelector('[data-testid="column-name"] input') as HTMLInputElement;
        return input?.value === 'plain';
      });
      if (!targetRow) throw new Error('\'plain\' var row not found in pre-request vars table');

      // Var rows have two CodeMirrors: value (index 0) and description (index 1)
      const cms = targetRow.querySelectorAll('.CodeMirror');
      const cm = (cms[1] as any)?.CodeMirror;
      if (!cm) throw new Error('Description CodeMirror not found in plain row');

      cm.setValue('First line\nSecond line');
    });

    // Find the 'plain' row in Playwright to assert both CM lines are reflected
    const varsTable = page.getByTestId('collection-request-vars');
    const plainRowIndex = await varsTable.locator('[data-testid="column-name"] input').evaluateAll(
      (inputs) => inputs.findIndex((el) => (el as HTMLInputElement).value === 'plain')
    );
    if (plainRowIndex === -1) throw new Error('\'plain\' var not found for assertion');

    const descCell = varsTable.locator('tbody tr').nth(plainRowIndex).getByTestId('column-description');
    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    // The vars section has a single "Save" button shared by pre and post tables
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Collection Settings saved successfully')).toBeVisible({ timeout: 5000 });

    // Verify the description was written to collection.bru
    const collectionBruPath = path.join(collectionFixturePath!, 'collection.bru');
    const fileContent = fs.readFileSync(collectionBruPath, 'utf8');

    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
