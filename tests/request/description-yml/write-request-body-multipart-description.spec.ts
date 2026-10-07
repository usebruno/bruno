import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';

const COLLECTION = 'req-description-yml';
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Request Description (YAML) - Write (Body: multipart-form)', () => {
  test('writes a multiline description to a multipart field and persists it to the .yml file', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openRequest(page, COLLECTION, 'multipart-with-descriptions');
    await selectRequestPaneTab(page, 'Body');

    const multipartTable = page.getByTestId('multipart-form-table');
    const plainRow = multipartTable.locator('tbody tr').nth(2);
    const descCell = plainRow.getByTestId('column-description');

    await descCell.evaluate((el) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in plain-field description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('Field line one\nField line two');
    });

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('Field line one');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Field line two');

    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully')).toBeVisible({ timeout: 5000 });

    const ymlPath = path.join(collectionFixturePath!, 'multipart-with-descriptions.yml');
    const fileContent = fs.readFileSync(ymlPath, 'utf8');

    expect(fileContent).toContain('description:');
    expect(fileContent).toContain('Field line one');
    expect(fileContent).toContain('Field line two');
  });
});
