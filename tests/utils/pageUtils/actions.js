import { expect } from '../../../playwright';

// starts import collection process, waits for modal, and uploads file
export async function startImportAndUploadFile(page, filePath) {
  await page.getByRole('button', { name: 'Import Collection' }).click();
  
  const importModal = page.getByRole('dialog');
  await importModal.waitFor({ state: 'visible' });
  await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
  
  await page.setInputFiles('input[type="file"]', filePath);
  
  return importModal;
}

// waits for the import collection loader to disappear
export async function waitForImportLoader(page) {
  await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });
}

// waits for the collection location modal to appear
export async function waitForLocationModal(page) {
  const locationModal = page.getByRole('dialog');
  await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
  return locationModal;
}

// verifies that a collection name appears in the location modal
export async function verifyCollectionInLocationModal(page, collectionName) {
  const locationModal = page.getByRole('dialog');
  await expect(locationModal.getByText(collectionName)).toBeVisible();
}

// completes the import process by setting location and clicking import
export async function completeImport(page, locationPath) {
  await page.locator('#collection-location').fill(locationPath);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
}

// verifies that a collection was imported successfully by checking the sidebar
export async function verifyCollectionImported(page, collectionName) {
  await expect(
    page.locator('#sidebar-collection-name').filter({ hasText: collectionName })
  ).toBeVisible();
}

// configures collection settings (Safe Mode) - navigates to first request if needed
export async function configureCollectionSettings(page, collectionName) {
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
  
  // check if Safe Mode checkbox is visible, if not navigate to first request
  const safeModeCheckbox = page.getByLabel('Safe Mode');
  const isSafeModeVisible = await safeModeCheckbox.isVisible();
  
  if (!isSafeModeVisible) {
    // navigate to first request to access Safe Mode settings
    await page.locator('.collection-item-name').first().click();
  }
  
  await page.getByLabel('Safe Mode').check();
  await page.getByRole('button', { name: 'Save' }).click();
}

// gets the count of requests in a collection
export async function getRequestCount(page, collectionId) {
  return await page.locator(`#collection-${collectionId} .collection-item-name`).count();
}

// closes a collection and returns to home page
export async function closeCollection(page, collectionName) {
  await page
    .locator('.collection-name')
    .filter({ has: page.locator(`#sidebar-collection-name:has-text("${collectionName}")`) })
    .locator('.collection-actions')
    .click();
  await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
}

// closes any open modals
export async function closeModals(page) {
  await page.locator('[data-test-id="modal-close-button"]').click();
}

export async function completeImportWorkflow(page, filePath, locationPath, expectedCollectionName) {
  await startImportAndUploadFile(page, filePath);
  await waitForImportLoader(page);
  await waitForLocationModal(page);
  await verifyCollectionInLocationModal(page, expectedCollectionName);
  await completeImport(page, locationPath);
  await verifyCollectionImported(page, expectedCollectionName);
  return page.locator('#sidebar-collection-name').filter({ hasText: expectedCollectionName });
}
