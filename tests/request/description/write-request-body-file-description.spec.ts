import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { openRequest, selectRequestPaneTab, saveRequest } from '../../utils/page';

const COLLECTION = 'req-description';

test.describe('Request Description - Write (Body: file)', () => {
  test('writes a multiline description to a file body row and persists it to the .bru file', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await test.step('Open request and navigate to Body tab', async () => {
      await openRequest(page, COLLECTION, 'file-with-descriptions');
      await selectRequestPaneTab(page, 'Body');
    });

    const fileTable = page.getByTestId('file-body-table');
    const plainRow = fileTable.locator('tbody tr').nth(2);
    const descCell = plainRow.getByTestId('column-description');

    await test.step('Set a multiline description on the file row', async () => {
      await descCell.evaluate((el) => {
        const cmEl = el.querySelector('.CodeMirror');
        if (!cmEl) throw new Error('No CodeMirror in plain-field description cell');
        const cm = (cmEl as any).CodeMirror;
        if (!cm) throw new Error('CodeMirror instance not found');
        cm.setValue('File line one\nFile line two');
      });

      await expect(descCell.locator('.CodeMirror-line').nth(0)).toHaveText('File line one');
      await expect(descCell.locator('.CodeMirror-line').nth(1)).toHaveText('File line two');
    });

    await saveRequest(page);

    await test.step('Verify the description was persisted to the .bru file', async () => {
      const bruPath = path.join(collectionFixturePath!, 'file-with-descriptions.bru');
      const fileContent = fs.readFileSync(bruPath, 'utf8');

      expect(fileContent).toContain('@description');
      expect(fileContent).toContain('File line one');
      expect(fileContent).toContain('File line two');
    });
  });
});
