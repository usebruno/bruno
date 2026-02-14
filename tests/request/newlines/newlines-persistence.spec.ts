import { test, expect, closeElectronApp } from '../../../playwright';
import { createCollection, openCollection } from '../../utils/page';
import { getTableCell } from '../../utils/page/locators';

test('should persist request with newlines across app restarts', async ({ createTmpDir, launchElectronApp }) => {
  const userDataPath = await createTmpDir('newlines-persistence-userdata');
  const collectionPath = await createTmpDir('newlines-persistence-collection');

  // Create collection and request
  const app1 = await launchElectronApp({ userDataPath });
  const page = await app1.firstWindow();

  await createCollection(page, 'newlines-persistence', collectionPath);

  const collection = page.getByTestId('collections').locator('.collection-name').filter({ hasText: 'newlines-persistence' });
  await collection.hover();
  await collection.locator('.collection-actions .icon').click();
  await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
  await page.getByPlaceholder('Request Name').fill('persistence-test');
  await page.locator('#new-request-url').locator('.CodeMirror').click();
  await page.locator('#new-request-url').locator('textarea').fill('https://httpbin.org/get');
  await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();

  await openCollection(page, 'newlines-persistence');

  await page.locator('.collection-item-name').filter({ hasText: 'persistence-test' }).dblclick();

  await page.getByRole('tab', { name: 'Params' }).click();
  const paramRow = page.locator('table tbody tr').first();
  await getTableCell(paramRow, 0).getByRole('textbox').fill('queryParamKey');

  await page.getByRole('tab', { name: 'Headers' }).click();
  const headerRow = page.locator('table tbody tr').first();
  await getTableCell(headerRow, 0).locator('.CodeMirror').click();
  await getTableCell(headerRow, 0).locator('textarea').fill('headerKey');
  await getTableCell(headerRow, 1).locator('.CodeMirror').click();
  await getTableCell(headerRow, 1).locator('textarea').fill('header\nValue');

  await page.getByRole('tab', { name: 'Vars' }).click();
  const preReqRow = page.locator('table').first().locator('tbody tr').first();
  await getTableCell(preReqRow, 0).getByRole('textbox').fill('preRequestVar');
  // Wait for table to stabilize after fill (new empty row may be appended)
  await expect(getTableCell(preReqRow, 0).getByRole('textbox')).toHaveValue('preRequestVar');
  await getTableCell(preReqRow, 1).locator('.CodeMirror').click();
  await getTableCell(preReqRow, 1).locator('textarea').fill('pre\nRequest\nValue');

  const postResRow = page.locator('table').nth(1).locator('tbody tr').first();
  await getTableCell(postResRow, 0).getByRole('textbox').fill('postResponseVar');
  // Wait for table to stabilize after fill (new empty row may be appended)
  await expect(getTableCell(postResRow, 0).getByRole('textbox')).toHaveValue('postResponseVar');
  await getTableCell(postResRow, 1).locator('.CodeMirror').click();
  await getTableCell(postResRow, 1).locator('textarea').fill('post\nResponse\nValue');

  const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
  await page.keyboard.press(saveShortcut);
  await expect(page.getByText('Request saved successfully')).toBeVisible();
  await closeElectronApp(app1);

  // Verify persistence after restart
  const app2 = await launchElectronApp({ userDataPath });
  const page2 = await app2.firstWindow();

  await page2.getByTestId('collections').locator('.collection-name').filter({ hasText: 'newlines-persistence' }).click();
  await page2.locator('.collection-item-name').filter({ hasText: 'persistence-test' }).dblclick();

  // Verify params persisted
  await page2.getByRole('tab', { name: 'Params' }).click();
  await expect(page2.locator('table tbody tr')).toHaveCount(2);

  // Verify headers persisted
  await page2.getByRole('tab', { name: 'Headers' }).click();
  await expect(page2.locator('table tbody tr')).toHaveCount(2);

  // Verify vars persisted
  await page2.getByRole('tab', { name: 'Vars' }).click();
  await expect(page2.locator('table').first().locator('tbody tr')).toHaveCount(2);
  await expect(page2.locator('table').nth(1).locator('tbody tr')).toHaveCount(2);

  await closeElectronApp(app2);
});
