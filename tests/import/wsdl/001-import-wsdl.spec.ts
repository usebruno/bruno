import { test, expect } from '../../playwright';
import * as path from 'path';

test.describe('Import WSDL Collection', () => {
  const testDataDir = path.join(__dirname, '..', 'test-data');

  test('Import WSDL successfully', async ({ page }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl.xml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', wsdlFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Import Collection modal is displayed (for location selection)
    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Wait for collection to appear in the location modal
    await expect(locationModal.getByText('TestService')).toBeVisible();

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });

  test('WSDL import generates correct Bruno collection structure', async ({ page }) => {
    const wsdlFile = path.join(testDataDir, 'wsdl.xml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });

    await page.setInputFiles('input[type="file"]', wsdlFile);
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const locationModal = page.getByRole('dialog');
    await expect(locationModal.getByText('TestService')).toBeVisible();

    // Verify the collection structure appears correctly
    // The collection should contain a UserService folder with GetUser and CreateUser operations
    await expect(locationModal.getByText('UserService')).toBeVisible();
    await expect(locationModal.getByText('GetUser')).toBeVisible();
    await expect(locationModal.getByText('CreateUser')).toBeVisible();

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
