import { test, expect } from '../playwright';
import path from 'path';

test.describe.parallel('Verify import collections', () => {
  
  //Import and verify bruno collection
  test('Import Bruno Collection', async ({ page, createTmpDir }) => {
    const importLocation = path.join(__dirname, './test-data/bruno-test.json');
    await page.locator('.icon').first().click();
    await page.locator('#tippy-2').getByText('Import Collection').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Bruno Collection' }).click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(importLocation);
    await page.locator('#collection-location').fill(await createTmpDir());
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeHidden()
    await expect(page.getByText('bruno-testbench')).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText('bruno-testbench').click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('body').press('ControlOrMeta+b');
    await page.getByRole('textbox', { name: 'Request Name' }).fill('R1');
    await page.getByRole('textbox', { name: 'URL' }).click();
    await page.getByRole('textbox', { name: 'URL' }).fill('example.com');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.locator('#send-request').getByRole('img').nth(2).click();
    await expect(page.getByText('OK')).toBeVisible();
  });
  //Import and verify Postman collection
  test('Import Postman Collection', async ({ page, createTmpDir }) => {
    const importLocation = path.join(__dirname, './test-data/Postman-test.json');
    await page.locator('.icon').first().click();
    await page.locator('#tippy-2').getByText('Import Collection').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Postman Collection' }).click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(path.join(importLocation));
    await page.locator('#collection-location').fill(await createTmpDir());
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeHidden()
    await expect(page.getByText('Postman-test')).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText('Postman-test').click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('body').press('ControlOrMeta+b');
    await page.getByRole('textbox', { name: 'Request Name' }).fill('R2');
    await page.getByRole('textbox', { name: 'URL' }).click();
    await page.getByRole('textbox', { name: 'URL' }).fill('example.com');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.locator('#send-request').getByRole('img').nth(2).click();
    await expect(page.getByText('OK')).toBeVisible();
  });
  //Import and verify Insomnia collection
  test('Import Insomnia Collection', async ({ page, createTmpDir }) => {
    const importLocation = path.join(__dirname, './test-data/Insomnia-test.yaml');
    await page.locator('.icon').first().click();
    await page.locator('#tippy-2').getByText('Import Collection').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Insomnia Collection' }).click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(path.join(importLocation));
    await page.locator('#collection-location').fill(await createTmpDir());
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeHidden()
    await expect(page.getByText('InsomniaCollection01')).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText('InsomniaCollection01').click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('body').press('ControlOrMeta+b');
    await page.getByRole('textbox', { name: 'Request Name' }).fill('R3');
    await page.getByRole('textbox', { name: 'URL' }).click();
    await page.getByRole('textbox', { name: 'URL' }).fill('example.com');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.locator('#send-request').getByRole('img').nth(2).click();
    await expect(page.getByText('OK')).toBeVisible();

  });
  //Import and verify OpenAPI collection
  test('Import OpenAPI Collection', async ({ page, createTmpDir }) => {
    const importLocation = path.join(__dirname, './test-data/openapi-test.yaml');
    await page.locator('.icon').first().click();
    await page.locator('#tippy-2').getByText('Import Collection').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'OpenAPI V3 Spec' }).click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(path.join(importLocation));
    await page.locator('#collection-location').fill(await createTmpDir());
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeHidden()
    await expect(page.getByText('OpenAPI-test')).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText('OpenAPI-test').click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('body').press('ControlOrMeta+b');
    await page.getByRole('textbox', { name: 'Request Name' }).fill('R3');
    await page.getByRole('textbox', { name: 'URL' }).click();
    await page.getByRole('textbox', { name: 'URL' }).fill('example.com');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.locator('#send-request').getByRole('img').nth(2).click();
    await expect(page.getByText('OK')).toBeVisible(); 
  });

});


