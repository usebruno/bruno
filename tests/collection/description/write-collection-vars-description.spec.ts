import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';

test.describe('Collection Settings Descriptions - Write (Vars)', () => {
  test('writes a multiline description to a pre-request var and persists it to collection.bru', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    test.setTimeout(30_000);

    // Open collection settings
    await page
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'col-description' })
      .click();
    // The tab label always reads "Collection" regardless of the collection name
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    await page.locator('.tab.vars').click();

    // Target the 'plain' row (row index 2) in the Pre Request VarsTable (first <table>).
    // Var rows have two CodeMirrors: value (nth 0) and description (nth 1).
    const varRows = page.locator('table').first().locator('tbody tr');
    const targetRow = varRows.nth(2);

    await page.evaluate(() => {
      // The vars tab renders two tables (pre-request, post-response).
      // The first table's row 2 is the 'plain' pre-request var.
      const tables = document.querySelectorAll('table');
      const rows = tables[0].querySelectorAll('tbody tr');
      const row = rows[2];
      if (!row) throw new Error('Row 2 not found in first table');
      const cms = row.querySelectorAll('.CodeMirror');
      const cm = (cms[1] as any)?.CodeMirror; // description is the 2nd CodeMirror (index 1)
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('First line\nSecond line');
    });

    await expect(targetRow.locator('.CodeMirror').nth(1).locator('.CodeMirror-line').nth(0)).toHaveText('First line', { timeout: 2000 });

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
