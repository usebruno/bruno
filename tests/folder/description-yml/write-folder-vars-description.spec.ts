import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openFolderSettings, setTableRowDescriptionValue } from '../../utils/page';

test.describe('Folder Settings Descriptions (YAML) - Write (Vars)', () => {
  test('writes a multiline description to a pre-request var and persists it to folder.yml', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openFolderSettings(page, 'fold-description-yml');

    await page.getByTestId('folder-settings-tab-vars').click();

    const varsTable = page.getByTestId('folder-vars-req');
    await expect(varsTable.locator('tbody tr').first()).toBeVisible();

    const plainRowIndex = await varsTable.locator('[data-testid="column-name"] input').evaluateAll(
      (inputs) => inputs.findIndex((el) => (el as HTMLInputElement).value === 'plain')
    );
    if (plainRowIndex === -1) throw new Error('\'plain\' var not found in pre-request vars table');

    const plainRow = varsTable.locator('tbody tr').nth(plainRowIndex);
    await setTableRowDescriptionValue(plainRow, 'First line\nSecond line');

    const descCell = plainRow.getByTestId('column-description');
    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Folder Settings saved successfully')).toBeVisible({ timeout: 5000 });

    const folderYmlPath = path.join(collectionFixturePath!, 'api', 'folder.yml');
    const fileContent = fs.readFileSync(folderYmlPath, 'utf8');

    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
