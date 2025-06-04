import { test, expect } from '../playwright';
import path from 'path';

test.describe.parallel('Verify all the opensource import collections', () => {
  test('Import Bruno Collection', async ({ page, createTmpDir }) => {
    const importLocation = path.join(__dirname, './test-data/bruno-testbench.json');
    await page.locator('.icon').first().click();
    await page.locator('#tippy-2').getByText('Import Collection').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Bruno Collection' }).click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(importLocation);
    await page.locator('#collection-location').fill(await createTmpDir());
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeHidden()
  });
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
  });
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
  });
  test('Import OpenAPI Collection', async ({ page, createTmpDir }) => {
    const importLocation = path.join(__dirname, './test-data/OpenAPI_file.yaml');
    await page.locator('.icon').first().click();
    await page.locator('#tippy-2').getByText('Import Collection').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'OpenAPI V3 Spec' }).click();
    const fileChooser = await fileChooserPromise;
    fileChooser.setFiles(path.join(importLocation));
    await page.locator('#collection-location').fill(await createTmpDir());
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeHidden()
  });
});












