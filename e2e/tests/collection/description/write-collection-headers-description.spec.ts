import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';

test.describe('Collection Settings Descriptions - Write (Headers)', () => {
  test('writes a multiline description to a header and persists it to collection.bru', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    // Open collection settings by clicking the collection name in the sidebar
    await page
      .locator('#sidebar-collection-name')
      .filter({ hasText: 'col-description' })
      .click();
    // The tab label always reads "Collection" regardless of the collection name
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    await page.locator('.tab.headers').click();

    // Find the X-Plain row by its header name, not by position
    const headersTable = page.getByTestId('collection-headers');
    const xPlainRow = headersTable.locator('tbody tr').filter({
      has: page.locator('[data-testid="column-name"] .CodeMirror-line', { hasText: 'X-Plain' })
    });
    const descCell = xPlainRow.getByTestId('column-description');

    // Use CodeMirror's JS API via locator.evaluate() so the `change` event fires synchronously
    // and the EditableTable onChange chain updates Redux state before we click Save.
    await descCell.evaluate((el) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in X-Plain description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('First line\nSecond line');
    });

    // Wait for CodeMirror DOM to reflect both lines before saving
    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    // Save and confirm
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Collection Settings saved successfully')).toBeVisible({ timeout: 5000 });

    // Verify the description was written to collection.bru
    const collectionBruPath = path.join(collectionFixturePath!, 'collection.bru');
    const fileContent = fs.readFileSync(collectionBruPath, 'utf8');

    expect(fileContent).toContain('@description');
    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
