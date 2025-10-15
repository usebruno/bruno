import { test, expect } from '../../../playwright';
import { openCollectionAndAcceptSandbox } from '../../utils/page/actions';

test('should persist request with newlines across app restarts', async ({ createTmpDir, launchElectronApp }) => {
  const userDataPath = await createTmpDir('newlines-persistence-userdata');
  const collectionPath = await createTmpDir('newlines-persistence-collection');

  // Helpers
  const fillCodeMirror = async (locator, value) => {
    await locator.locator('.CodeMirror').click();
    await locator.locator('textarea').fill(value);
  };

  const getCell = (row, index) => row.locator('td').nth(index);

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
  await fillCodeMirror(page.locator('#new-request-url'), 'https://httpbin.org/get');
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await openCollectionAndAcceptSandbox(page, 'newlines-persistence', 'safe');
  await page.locator('.collection-item-name').filter({ hasText: 'persistence-test' }).dblclick();

  // Add query param
  await page.getByRole('tab', { name: 'Params' }).click();
  await page.getByRole('button', { name: /Add.*Param/i }).click();

  const paramRow = page.locator('table tbody tr').last();
  await getCell(paramRow, 0).locator('input[type="text"]').fill('queryParamKey');

  // Add header with newlines
  await page.getByRole('tab', { name: 'Headers' }).click();
  await page.getByRole('button', { name: /Add.*Header/i }).click();

  const headerRow = page.locator('table tbody tr').last();
  await fillCodeMirror(getCell(headerRow, 0), 'headerKey');
  await fillCodeMirror(getCell(headerRow, 1), 'header\nValue');

  // Add Pre Request var with newlines
  await page.getByRole('tab', { name: 'Vars' }).click();
  await page.locator('.btn-add-var').first().click();
  const preReqRow = page.locator('table').first().locator('tbody tr').first();
  await getCell(preReqRow, 0).locator('input[type="text"]').fill('preRequestVar');
  await fillCodeMirror(getCell(preReqRow, 1), 'pre\nRequest\nValue');

  // Add Post Response var with newlines
  await page.locator('.btn-add-var').last().click();
  const postResRow = page.locator('table').nth(1).locator('tbody tr').first();
  await getCell(postResRow, 0).locator('input[type="text"]').fill('postResponseVar');
  await fillCodeMirror(getCell(postResRow, 1), 'post\nResponse\nValue');

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
  await expect(page2.locator('table').first().locator('tbody tr')).toHaveCount(1);
  await expect(page2.locator('table').nth(1).locator('tbody tr')).toHaveCount(1);

  await app2.close();
});
