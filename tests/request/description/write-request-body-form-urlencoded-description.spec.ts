import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';

const COLLECTION = 'req-description';
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Request Description - Write (Body: form-urlencoded)', () => {
  test('writes a multiline description to a form field and persists it to the .bru file', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openRequest(page, COLLECTION, 'formurlencoded-with-descriptions');
    await selectRequestPaneTab(page, 'Body');

    const formTable = page.getByTestId('form-urlencoded-table');
    const plainRow = formTable.locator('tbody tr').nth(2);
    const descCell = plainRow.getByTestId('column-description');

    await descCell.evaluate((el) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in plain-field description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('Form line one\nForm line two');
    });

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('Form line one');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Form line two');

    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully')).toBeVisible({ timeout: 5000 });

    const bruPath = path.join(collectionFixturePath!, 'formurlencoded-with-descriptions.bru');
    const fileContent = fs.readFileSync(bruPath, 'utf8');

    expect(fileContent).toContain('@description');
    expect(fileContent).toContain('Form line one');
    expect(fileContent).toContain('Form line two');
  });
});
