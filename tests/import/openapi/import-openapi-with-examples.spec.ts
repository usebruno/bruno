import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections } from '../../utils/page';

test.describe('Import OpenAPI Collection with Examples', () => {
  let originalShowOpenDialog;

  test.beforeAll(async ({ electronApp }) => {
    // save the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      originalShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    // restore the original showOpenDialog function
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = originalShowOpenDialog;
    });
  });

  test('should import OpenAPI collection with examples successfully', async ({ page, electronApp, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-with-examples.yaml');

    // Create a temporary directory for the collection to be imported into
    const importDir = await createTmpDir('imported-openapi-collection');

    // Mock the electron dialog to return the import directory selection
    await electronApp.evaluate(({ dialog }, { importDir }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [importDir]
      });
    }, { importDir });

    await test.step('Open import collection modal', async () => {
      await page.getByRole('button', { name: 'Import Collection' }).click();
    });

    await test.step('Wait for import modal and verify title', async () => {
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Upload OpenAPI collection file using hidden file input', async () => {
      // The "choose a file" button triggers a hidden file input, so we can directly set files on it
      await page.setInputFiles('input[type="file"]', openApiFile);
    });

    await test.step('Wait for file processing to complete', async () => {
      await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });
    });

    await test.step('Verify no parsing errors occurred', async () => {
      const hasError = await page.getByText('Failed to parse the file').isVisible().catch(() => false);
      if (hasError) {
        throw new Error('Collection import failed with parsing error');
      }
    });

    await test.step('Verify OpenAPI import settings modal appears', async () => {
      const settingsModal = page.getByRole('dialog');
      await expect(settingsModal.locator('.bruno-modal-header-title')).toContainText('OpenAPI Import Settings');
      await settingsModal.getByRole('button', { name: 'Import' }).click();
    });

    await test.step('Click Browse link to select collection folder', async () => {
      const settingsModal = page.getByRole('dialog');
      await settingsModal.getByText('Browse').click();
    });

    await test.step('Complete import by clicking import button', async () => {
      const settingsModal = page.getByRole('dialog');
      await settingsModal.getByRole('button', { name: 'Import' }).click();
      await page.locator('#sidebar-collection-name').filter({ hasText: 'API with Examples' }).click();
    });

    await test.step('Handle sandbox modal', async () => {
      const saveButton = page.getByRole('button', { name: 'Save' });
      await expect(saveButton).toBeVisible();
      await saveButton.click();
    });

    await test.step('Verify collection name appears in sidebar', async () => {
      const collectionName = page.locator('#sidebar-collection-name').getByText('API with Examples');
      await expect(collectionName).toBeVisible();
    });

    await test.step('Verify GET /users request exists and has examples', async () => {
      const getUsersRequest = page.locator('.collection-item-name').getByText('Get all users');
      await expect(getUsersRequest).toBeVisible();

      // Find the chevron icon specifically for the "Get all users" request
      const chevronIcon = page.getByTestId('request-item-chevron').nth(0);
      await expect(chevronIcon).toBeVisible();

      // Click the chevron to expand examples
      await chevronIcon.click();

      // Wait a moment for the examples to appear
      await page.waitForTimeout(500);

      // Check if examples are visible
      const successExample = page.locator('.collection-item-name').getByText('Success Response');
      const emptyExample = page.locator('.collection-item-name').getByText('Empty Response');
      const validationErrorExample = page.locator('.collection-item-name').getByText('Validation Error');
      const serverErrorExample = page.locator('.collection-item-name').getByText('Server Error');

      await expect(successExample).toBeVisible();
      await expect(emptyExample).toBeVisible();
      await expect(validationErrorExample).toBeVisible();
      await expect(serverErrorExample).toBeVisible();

      await chevronIcon.click();
    });

    await test.step('Verify POST /users request exists and has examples', async () => {
      // Click on the POST request
      const createUserRequest = page.locator('.collection-item-name').getByText('Create a new user');
      await expect(createUserRequest).toBeVisible();
      await createUserRequest.click();

      // Wait for the request to load
      await page.waitForTimeout(1000);

      // Find the chevron icon specifically for the "Create a new user" request
      const chevronIcon = page.getByTestId('request-item-chevron').nth(1);
      await expect(chevronIcon).toBeVisible();

      // Click the chevron to expand examples
      await chevronIcon.click();

      // Wait a moment for the examples to appear
      await page.waitForTimeout(500);

      // Check if examples are visible
      const createdExample = page.locator('.collection-item-name').getByText('User Created');
      const validationErrorExample = page.locator('.collection-item-name').getByText('Validation Error');

      await expect(createdExample).toBeVisible();
      await expect(validationErrorExample).toBeVisible();
    });

    await test.step('Cleanup - close all collections', async () => {
      await closeAllCollections(page);
    });
  });

  test('should import OpenAPI collection with path-based grouping', async ({ page, electronApp, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-with-examples.yaml');

    // Create a temporary directory for the collection to be imported into
    const importDir = await createTmpDir('imported-openapi-collection-path');

    // Mock the electron dialog to return the import directory selection
    await electronApp.evaluate(({ dialog }, { importDir }) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [importDir]
      });
    }, { importDir });

    await test.step('Open import collection modal', async () => {
      await page.getByRole('button', { name: 'Import Collection' }).click();
    });

    await test.step('Wait for import modal and verify title', async () => {
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Upload OpenAPI collection file using hidden file input', async () => {
      await page.setInputFiles('input[type="file"]', openApiFile);
    });

    await test.step('Wait for file processing to complete', async () => {
      await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });
    });

    await test.step('Verify no parsing errors occurred', async () => {
      const hasError = await page.getByText('Failed to parse the file').isVisible().catch(() => false);
      if (hasError) {
        throw new Error('Collection import failed with parsing error');
      }
    });

    await test.step('Verify OpenAPI import settings modal appears', async () => {
      const settingsModal = page.getByRole('dialog');
      await expect(settingsModal.locator('.bruno-modal-header-title')).toContainText('OpenAPI Import Settings');
    });

    await test.step('Select path-based grouping option from dropdown', async () => {
      const settingsModal = page.getByRole('dialog');

      // Click on the grouping dropdown to open it
      const groupingDropdown = settingsModal.getByTestId('grouping-dropdown');
      await expect(groupingDropdown).toBeVisible();
      await groupingDropdown.click();

      // Wait for dropdown to open and select "Paths" option (note: it's "Paths" not "Path")
      const pathOption = page.getByTestId('grouping-option-path');
      await expect(pathOption).toBeVisible();
      await pathOption.click();
      // click on import button
      const importButton = settingsModal.getByRole('button', { name: 'Import' });
      await expect(importButton).toBeVisible();
      await importButton.click();
    });

    await test.step('Click Browse link to select collection folder', async () => {
      const settingsModal = page.getByRole('dialog');
      await settingsModal.getByText('Browse').click();
    });

    await test.step('Complete import by clicking import button', async () => {
      const settingsModal = page.getByRole('dialog');
      await settingsModal.getByRole('button', { name: 'Import' }).click();
      await page.locator('#sidebar-collection-name').filter({ hasText: 'API with Examples' }).click();
    });

    await test.step('Handle sandbox modal', async () => {
      const saveButton = page.getByRole('button', { name: 'Save' });
      await expect(saveButton).toBeVisible();
      await saveButton.click();
    });

    await test.step('Verify collection name appears in sidebar', async () => {
      const collectionName = page.locator('#sidebar-collection-name').getByText('API with Examples');
      await expect(collectionName).toBeVisible();
    });

    await test.step('Verify path-based grouping structure', async () => {
      // With path-based grouping, requests should be organized by their path
      // users should be a folder containing GET and POST requests
      const usersFolder = page.locator('.collection-item-name').getByText('users');
      await expect(usersFolder).toBeVisible();

      // Click on the users folder to expand it
      await usersFolder.click();
      await page.waitForTimeout(500);

      // Verify that the requests are inside the users folder
      const getUsersRequest = page.locator('.collection-item-name').getByText('Get all users');
      const createUserRequest = page.locator('.collection-item-name').getByText('Create a new user');

      await expect(getUsersRequest).toBeVisible();
      await expect(createUserRequest).toBeVisible();
    });

    await test.step('Verify examples work with path-based grouping', async () => {
      // Test GET /users request examples
      const getUsersRequest = page.locator('.collection-item-name').getByText('Get all users');
      await expect(getUsersRequest).toBeVisible();

      const chevronIcon = page.getByTestId('request-item-chevron').nth(0);
      await expect(chevronIcon).toBeVisible();
      await chevronIcon.click();
      await page.waitForTimeout(500);

      // Check if examples are visible
      const successExample = page.locator('.collection-item-name').getByText('Success Response');
      await expect(successExample).toBeVisible();
    });

    await test.step('Cleanup - close all collections', async () => {
      await closeAllCollections(page);
    });
  });
});
