import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openFolderSettings, setTableRowDescriptionValue } from '../../utils/page';

test.describe('Folder Settings Descriptions (YAML) - Write (Headers)', () => {
  test('writes a multiline description to a header and persists it to folder.yml', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openFolderSettings(page, 'fold-description-yml');

    await page.getByTestId('folder-settings-tab-headers').click();

    const headersTable = page.locator('table').first();
    const xPlainRow = headersTable.locator('tbody tr').filter({
      has: page.locator('[data-testid="column-name"] .CodeMirror-line', { hasText: 'X-Plain' })
    });
    const descCell = xPlainRow.getByTestId('column-description');

    await setTableRowDescriptionValue(xPlainRow, 'First line\nSecond line');

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Folder Settings saved successfully')).toBeVisible({ timeout: 5000 });

    const folderYmlPath = path.join(collectionFixturePath!, 'api', 'folder.yml');
    const fileContent = fs.readFileSync(folderYmlPath, 'utf8');

    expect(fileContent).toContain('description:');
    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
