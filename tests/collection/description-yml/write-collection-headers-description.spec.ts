import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';

test.describe('Collection Settings Descriptions (YAML) - Write (Headers)', () => {
  test('writes a multiline description to a header and persists it to opencollection.yml', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'col-description-yml' }).click();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    await page.getByTestId('collection-settings-tab-headers').click();

    const headersTable = page.getByTestId('collection-headers');
    const xPlainRow = headersTable.locator('tbody tr').filter({
      has: page.locator('[data-testid="column-name"] .CodeMirror-line', { hasText: 'X-Plain' })
    });
    const descCell = xPlainRow.getByTestId('column-description');

    await descCell.evaluate((el) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in X-Plain description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('First line\nSecond line');
    });

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Collection Settings saved successfully')).toBeVisible({ timeout: 5000 });

    const ymlPath = path.join(collectionFixturePath!, 'opencollection.yml');
    const fileContent = fs.readFileSync(ymlPath, 'utf8');

    expect(fileContent).toContain('description:');
    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
