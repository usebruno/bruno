import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';

test.describe('Collection Settings Descriptions (YAML) - Write (Vars)', () => {
  test('writes a multiline description to a pre-request var and persists it to opencollection.yml', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await page.locator('#sidebar-collection-name').filter({ hasText: 'col-description-yml' }).click();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    await page.getByTestId('collection-settings-tab-vars').click();
    await expect(page.getByTestId('collection-vars-req').locator('tbody tr').first()).toBeVisible();

    await page.evaluate(() => {
      const table = document.querySelector('[data-testid="collection-vars-req"]');
      const rows = table?.querySelectorAll('tbody tr') ?? [];
      const targetRow = Array.from(rows).find((row) => {
        const input = row.querySelector('[data-testid="column-name"] input') as HTMLInputElement;
        return input?.value === 'plain';
      });
      if (!targetRow) throw new Error('\'plain\' var row not found in pre-request vars table');

      const cms = targetRow.querySelectorAll('.CodeMirror');
      const cm = (cms[1] as any)?.CodeMirror;
      if (!cm) throw new Error('Description CodeMirror not found in plain row');

      cm.setValue('First line\nSecond line');
    });

    const varsTable = page.getByTestId('collection-vars-req');
    const plainRowIndex = await varsTable.locator('[data-testid="column-name"] input').evaluateAll(
      (inputs) => inputs.findIndex((el) => (el as HTMLInputElement).value === 'plain')
    );
    if (plainRowIndex === -1) throw new Error('\'plain\' var not found for assertion');

    const descCell = varsTable.locator('tbody tr').nth(plainRowIndex).getByTestId('column-description');
    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Collection Settings saved successfully')).toBeVisible({ timeout: 5000 });

    const ymlPath = path.join(collectionFixturePath!, 'opencollection.yml');
    const fileContent = fs.readFileSync(ymlPath, 'utf8');

    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
