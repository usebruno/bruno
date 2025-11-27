import { test, expect } from '../../../playwright';
import { openCollectionAndAcceptSandbox } from '../../utils/page/actions';
import { getTableCell } from '../../utils/page/locators';

test('should persist request with newlines across app restarts', async ({ createTmpDir, launchElectronApp }) => {
  const userDataPath = await createTmpDir('newlines-persistence-userdata');
  const collectionPath = await createTmpDir('newlines-persistence-collection');

  // Create collection and request
  const app1 = await launchElectronApp({ userDataPath });
  const page = await app1.firstWindow();

  await page.locator('.dropdown-icon').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
  await page.getByLabel('Name').fill('newlines-persistence');
  await page.getByLabel('Location').fill(collectionPath);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  const collection = page.locator('.collection-name').filter({ hasText: 'newlines-persistence' });
  await collection.locator('.collection-actions').hover();
  await collection.locator('.collection-actions .icon').click();
  await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
  await page.getByPlaceholder('Request Name').fill('persistence-test');
  await page.locator('#new-request-url').locator('.CodeMirror').click();
  await page.locator('#new-request-url').locator('textarea').fill('https://httpbin.org/get');
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await openCollectionAndAcceptSandbox(page, 'newlines-persistence', 'safe');
  await page.locator('.collection-item-name').filter({ hasText: 'persistence-test' }).dblclick();

  // Add query param
  await page.getByRole('tab', { name: 'Params' }).click();
  await page.getByRole('button', { name: /Add.*Param/i }).click();

  const paramRow = page.locator('table tbody tr').last();
  await getTableCell(paramRow, 0).locator('input[type="text"]').fill('queryParamKey');

  // Add header with newlines
  await page.getByRole('tab', { name: 'Headers' }).click();
  await page.getByRole('button', { name: /Add.*Header/i }).click();

  const headerRow = page.locator('table tbody tr').last();
  await getTableCell(headerRow, 0).locator('.CodeMirror').click();
  await getTableCell(headerRow, 0).locator('textarea').fill('headerKey');
  await getTableCell(headerRow, 1).locator('.CodeMirror').click();
  await getTableCell(headerRow, 1).locator('textarea').fill('header\nValue');

  // Add Pre Request var with newlines
  await page.getByRole('tab', { name: 'Vars' }).click();
  await page.locator('.btn-add-var').click();
  const preReqRow = page.locator('table tbody tr').first();
  await getTableCell(preReqRow, 0).locator('input[type="text"]').fill('preRequestVar');
  await getTableCell(preReqRow, 1).locator('.CodeMirror').click();
  await getTableCell(preReqRow, 1).locator('textarea').fill('pre\nRequest\nValue');

  await page.keyboard.press('Meta+s');
  await app1.close();

  // Verify persistence after restart
  const app2 = await launchElectronApp({ userDataPath });
  const page2 = await app2.firstWindow();

  await page2.locator('.collection-name').filter({ hasText: 'newlines-persistence' }).click();
  await page2.locator('.collection-item-name').filter({ hasText: 'persistence-test' }).dblclick();

  // Verify params persisted
  await page2.getByRole('tab', { name: 'Params' }).click();
  await expect(page2.locator('table tbody tr')).toHaveCount(1);

  // Verify headers persisted
  await page2.getByRole('tab', { name: 'Headers' }).click();
  await expect(page2.locator('table tbody tr')).toHaveCount(1);

  // Verify vars persisted
  await page2.getByRole('tab', { name: 'Vars' }).click();
  await expect(page2.locator('table tbody tr')).toHaveCount(1);

  await app2.close();
});
