import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';

test.describe('Collection Settings Descriptions - Write (Headers)', () => {
  test('writes a multiline description to a header and persists it to collection.bru', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    test.setTimeout(30_000);

    // Open collection settings by clicking the collection name in the sidebar
    await page
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'col-description' })
      .click();
    // The tab label always reads "Collection" regardless of the collection name
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    await page.locator('.tab.headers').click();

    // Target the X-Plain row (row index 2) and its description editor (CodeMirror index 2)
    const headerRows = page.locator('table').first().locator('tbody tr');
    const targetRow = headerRows.nth(2);

    // Use CodeMirror's JS API directly so the `change` event fires synchronously and
    // the EditableTable onChange chain updates Redux state before we click Save.
    await page.evaluate(() => {
      const rows = document.querySelectorAll('table:first-of-type tbody tr');
      const row = rows[2];
      if (!row) throw new Error('Row 2 not found');
      const cms = row.querySelectorAll('.CodeMirror');
      const cm = (cms[2] as any)?.CodeMirror; // description is the 3rd CodeMirror (index 2)
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('First line\nSecond line');
    });

    // Wait for CodeMirror DOM to reflect the value
    await expect(targetRow.locator('.CodeMirror').nth(2).locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await page.waitForTimeout(200);

    // Save and confirm
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Collection Settings saved successfully')).toBeVisible({ timeout: 5000 });

    // Verify the description was written to collection.bru
    const collectionBruPath = path.join(collectionFixturePath!, 'collection.bru');
    const fileContent = fs.readFileSync(collectionBruPath, 'utf8');

    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
