import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION = 'req-description-yml';
const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Request Description (YAML) - Write (Vars)', () => {
  test('writes a multiline description to a request var and persists it to the .yml file', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openRequest(page, COLLECTION, 'request-with-descriptions');
    await selectRequestPaneTab(page, 'Vars');

    const varsTable = buildCommonLocators(page).table('request-vars-req');
    const plainVarRow = varsTable.rowByName('plainVar');
    const descCell = plainVarRow.getByTestId('column-description');

    await descCell.evaluate((el) => {
      const cmEl = el.querySelector('.CodeMirror');
      if (!cmEl) throw new Error('No CodeMirror in plainVar description cell');
      const cm = (cmEl as any).CodeMirror;
      if (!cm) throw new Error('CodeMirror instance not found');
      cm.setValue('First line\nSecond line');
    });

    await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('First line');
    await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('Second line');

    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully')).toBeVisible({ timeout: 5000 });

    const ymlPath = path.join(collectionFixturePath!, 'request-with-descriptions.yml');
    const fileContent = fs.readFileSync(ymlPath, 'utf8');

    expect(fileContent).toContain('description:');
    expect(fileContent).toContain('First line');
    expect(fileContent).toContain('Second line');
  });
});
