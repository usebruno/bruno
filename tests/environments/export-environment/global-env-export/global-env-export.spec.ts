import { test, expect } from '../../../../playwright';
import path from 'path';
import fs from 'fs';

// Helper function to load expected fixtures
function loadExpectedFixture(fixturePath: string) {
  const fullPath = path.join(__dirname, '..', '../fixtures', 'environment-exports', fixturePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

// Helper function to normalize dynamic fields for comparison
function normalizeExportedContent(content: any) {
  if (content.info) {
    // Replace dynamic fields with fixed values for comparison
    content.info.exportedAt = '2024-01-01T00:00:00.000Z';
    content.info.exportedUsing = 'Bruno/v1.0.0';
  }
  // Handle individual environment files that have info at the root level
  if (content.name && content.variables && content.info) {
    content.info.exportedAt = '2024-01-01T00:00:00.000Z';
    content.info.exportedUsing = 'Bruno/v1.0.0';
  }
  return content;
}

test.describe.serial('Global Environment Export Tests', () => {
  test.describe.serial('folder exports', () => {
    test('should export single global environment', async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const exportDir = await createTmpDir('global-env-export-single');

      await test.step('Open collection and navigate to global environment settings', async () => {
        // Open the collection from sidebar
        await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Export Test Collection' }).click();

        // Open global environment settings
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
        await page.getByText('Configure', { exact: true }).click();

        // Verify the global environment settings modal opens
        const globalEnvModal = page.locator('.bruno-modal').filter({ hasText: 'Global Environments' });
        await expect(globalEnvModal).toBeVisible();
      });

      await test.step('Open export modal and configure export settings', async () => {
        // Click export button
        await page.locator('.btn-import-environment').getByText('Export').click();

        // Verify export modal opens
        const exportModal = page.locator('.bruno-modal').filter({ hasText: 'Export Environments' });
        await expect(exportModal).toBeVisible();

        // Deselect all environments first
        await page.getByText('Deselect All').click();

        // Select only "local" environment
        const localEnvCheckbox = page.locator('label').filter({ hasText: 'local' }).locator('input[type="checkbox"]');
        await localEnvCheckbox.check();

        // Set export directory
        await page.locator('input[id="export-location"]').fill(exportDir);
      });

      await test.step('Execute export and close modal', async () => {
        // Export the environment
        await page.getByRole('button', { name: 'Export 1 Environment' }).click();

        await page.getByTestId('modal-close-button').click();
      });

      await test.step('Verify exported file and content', async () => {
        // Verify exported file exists
        const exportedFile = path.join(exportDir, 'local.json');

        expect(fs.existsSync(exportedFile)).toBe(true);

        // Verify file content matches expected fixture
        const exportedContent = JSON.parse(fs.readFileSync(exportedFile, 'utf8'));
        const expectedContent = loadExpectedFixture('bruno-global-environments/local.json');

        expect(normalizeExportedContent(exportedContent)).toEqual(expectedContent);
      });
    });

    test('should export multiple global environments', async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const exportDir = await createTmpDir('global-env-export-multiple');

      await test.step('Open collection and navigate to global environment settings', async () => {
        // Open the collection from sidebar
        await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Export Test Collection' }).click();

        // Open global environment settings
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
        await page.getByText('Configure', { exact: true }).click();
      });

      await test.step('Configure export settings for multiple environments', async () => {
        // Click export button
        await page.locator('.btn-import-environment').getByText('Export').click();

        // Verify all environments are selected by default
        await expect(page.getByRole('checkbox', { name: 'Local' })).toBeChecked();
        await expect(page.getByRole('checkbox', { name: 'Prod' })).toBeChecked();

        // Select folder export format (default might be single JSON file)
        await page.getByText('Separate files in folder').click();

        // Set export directory
        await page.locator('input[id="export-location"]').fill(exportDir);
      });

      await test.step('Execute export and close modal', async () => {
        // Export all environments
        await page.getByRole('button', { name: /Export \d+ Environments?/ }).click();

        await page.getByTestId('modal-close-button').click();
      });

      await test.step('Verify exported files and content', async () => {
        // Verify exported files exist
        const exportPath = path.join(exportDir, 'bruno-global-environments');
        expect(fs.existsSync(exportPath)).toBe(true);

        const expectedFiles = [
          'local.json',
          'prod.json'
        ];

        for (const fileName of expectedFiles) {
          const filePath = path.join(exportPath, fileName);
          expect(fs.existsSync(filePath)).toBe(true);

          // Verify file content matches expected fixture
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const expectedContent = loadExpectedFixture(`bruno-global-environments/${fileName}`);
          expect(normalizeExportedContent(content)).toEqual(expectedContent);
        }
      });
    });

    test('should generate unique names when the export directory already contains previously exported contents', async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const exportDir = await createTmpDir('global-env-export-conflict');

      await test.step('Setup existing export directory to simulate conflict', async () => {
        // Create existing export directory and file to simulate conflict
        const existingExportPath = path.join(exportDir, 'bruno-global-environments');
        fs.mkdirSync(existingExportPath, { recursive: true });
        fs.writeFileSync(path.join(existingExportPath, 'local.json'), '{}');
      });

      await test.step('Open collection and navigate to global environment settings', async () => {
        // Open the collection from sidebar
        await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Export Test Collection' }).click();

        // Open global environment settings
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
        await page.getByText('Configure', { exact: true }).click();
      });

      await test.step('Configure export settings with folder format', async () => {
        // Click export button
        await page.locator('.btn-import-environment').getByText('Export').click();

        // Set export directory
        await page.locator('input[id="export-location"]').fill(exportDir);

        // Select folder export format
        await page.getByText('Separate files in folder').click();
      });

      await test.step('Execute export and close modal', async () => {
        // Export should succeed with unique names
        await page.getByRole('button', { name: 'Export 2 Environment' }).click();

        await page.getByTestId('modal-close-button').first().click();
      });

      await test.step('Verify unique naming and file content', async () => {
        // Verify original folder still exists
        const existingExportPath = path.join(exportDir, 'bruno-global-environments');
        expect(fs.existsSync(existingExportPath)).toBe(true);
        expect(fs.existsSync(path.join(existingExportPath, 'local.json'))).toBe(true);

        // Verify new folder with unique name was created
        const uniqueExportPath = path.join(exportDir, 'bruno-global-environments copy');
        expect(fs.existsSync(uniqueExportPath)).toBe(true);

        // Verify the new file exists in the unique folder
        const newExportedFile = path.join(uniqueExportPath, 'local.json');
        expect(fs.existsSync(newExportedFile)).toBe(true);

        // Verify file content matches expected fixture
        const exportedContent = JSON.parse(fs.readFileSync(newExportedFile, 'utf8'));
        const expectedContent = loadExpectedFixture('bruno-global-environments/local.json');
        expect(normalizeExportedContent(exportedContent)).toEqual(expectedContent);
      });
    });
  });

  test.describe.serial('json file exports', () => {
    test('should export single global environment as object', async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const exportDir = await createTmpDir('global-env-export-single-object');

      await test.step('Open collection and navigate to global environment settings', async () => {
        // Open the collection from sidebar
        await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Export Test Collection' }).click();

        // Open global environment settings
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
        await page.getByText('Configure', { exact: true }).click();
      });

      await test.step('Configure export settings for single JSON file', async () => {
        // Click export button
        await page.locator('.btn-import-environment').getByText('Export').click();

        // Deselect all environments first
        await page.getByText('Deselect All').click();

        // Select only "local" environment
        const localEnvCheckbox = page.locator('label').filter({ hasText: 'local' }).locator('input[type="checkbox"]');
        await localEnvCheckbox.check();

        // Single JSON file format is automatically selected for single environment
        // The backend will automatically use 'single-object' format for single environment
        await page.getByText('Single JSON file').click();

        // Set export directory
        await page.locator('input[id="export-location"]').fill(exportDir);
      });

      await test.step('Execute export and verify success', async () => {
        // Export the environment
        await page.getByRole('button', { name: 'Export 1 Environment' }).click();

        // Verify success message
        await expect(page.getByText('Environment(s) exported successfully', { exact: false }).first()).toBeVisible();

        await page.getByTestId('modal-close-button').click();
      });

      await test.step('Verify exported file and content', async () => {
        // Verify exported file exists
        const exportedFile = path.join(exportDir, 'local.json');
        expect(fs.existsSync(exportedFile)).toBe(true);

        // Verify file content matches expected fixture
        const content = JSON.parse(fs.readFileSync(exportedFile, 'utf8'));
        const expectedContent = loadExpectedFixture('local.json');
        expect(normalizeExportedContent(content)).toEqual(expectedContent);
      });
    });

    test('should export multiple global environments as single JSON file', async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const exportDir = await createTmpDir('global-env-export-single-file');

      await test.step('Open collection and navigate to global environment settings', async () => {
        // Open the collection from sidebar
        await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Export Test Collection' }).click();

        // Open global environment settings
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
        await page.getByText('Configure', { exact: true }).click();
      });

      await test.step('Configure export settings for single JSON file', async () => {
        // Click export button
        await page.locator('.btn-import-environment').getByText('Export').click();

        // Select single JSON file format
        await page.getByText('Single JSON file').click();

        // Set export directory
        await page.locator('input[id="export-location"]').fill(exportDir);
      });

      await test.step('Execute export and verify success', async () => {
        // Export the environments
        await page.getByRole('button', { name: 'Export 2 Environments' }).click();
        await page.waitForTimeout(200);
        // Verify success message
        await expect(page.getByText('Environment(s) exported successfully', { exact: false }).first()).toBeVisible();

        await page.getByTestId('modal-close-button').click();
      });

      await test.step('Verify exported file and content', async () => {
        // Verify exported file exists
        const exportedFile = path.join(exportDir, 'bruno-global-environments.json');
        expect(fs.existsSync(exportedFile)).toBe(true);

        // Verify file content matches expected fixture
        const content = JSON.parse(fs.readFileSync(exportedFile, 'utf8'));
        const expectedContent = loadExpectedFixture('bruno-global-environments.json');
        expect(normalizeExportedContent(content)).toEqual(expectedContent);
      });
    });

    test('should generate unique names when the export directory already contains previously exported contents', async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const exportDir = await createTmpDir('global-env-export-single-object-conflict');

      await test.step('Setup existing export file to simulate conflict', async () => {
        // Create existing export directory and file to simulate conflict
        const existingExportJsonPath = path.join(exportDir, 'local.json');
        fs.writeFileSync(existingExportJsonPath, '{}');
      });

      await test.step('Open collection and navigate to global environment settings', async () => {
        // Open the collection from sidebar
        await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Export Test Collection' }).click();

        // Open global environment settings
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
        await page.getByText('Configure', { exact: true }).click();
      });

      await test.step('Configure export settings for single JSON file', async () => {
        // Click export button
        await page.locator('.btn-import-environment').getByText('Export').click();

        // Deselect all environments first
        await page.getByText('Deselect All').click();

        // Select only "local" environment
        const localEnvCheckbox = page.locator('label').filter({ hasText: 'local' }).locator('input[type="checkbox"]');
        await localEnvCheckbox.check();

        // Single JSON file format is automatically selected for single environment
        // The backend will automatically use 'single-object' format for single environment
        await page.getByText('Single JSON file').click();

        // Set export directory
        await page.locator('input[id="export-location"]').fill(exportDir);
      });

      await test.step('Execute export and close modal', async () => {
        // Export should succeed with unique names
        await page.getByRole('button', { name: 'Export 1 Environment' }).click();

        await page.getByTestId('modal-close-button').first().click();
      });

      await test.step('Verify unique naming and file content', async () => {
        // Verify original file still exists
        const existingExportJsonPath = path.join(exportDir, 'local.json');
        expect(fs.existsSync(existingExportJsonPath)).toBe(true);

        // Verify new file with unique name was created
        const uniqueExportPath = path.join(exportDir, 'local copy.json');
        expect(fs.existsSync(uniqueExportPath)).toBe(true);

        // Verify file content matches expected fixture
        const exportedContent = JSON.parse(fs.readFileSync(uniqueExportPath, 'utf8'));
        const expectedContent = loadExpectedFixture('local.json');
        expect(normalizeExportedContent(exportedContent)).toEqual(expectedContent);
      });
    });
  });

  // common tests
  test('should not be able to export, when no environments are selected', async ({
    pageWithUserData: page,
    createTmpDir
  }) => {
    const exportDir = await createTmpDir('global-env-export-no-selection');

    await test.step('Open collection and navigate to global environment settings', async () => {
      // Open the collection from sidebar
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Export Test Collection' }).click();

      // Open global environment settings
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();
      await page.getByText('Configure', { exact: true }).click();
    });

    await test.step('Open export modal and deselect all environments', async () => {
      // Click export button
      await page.locator('.btn-import-environment').getByText('Export').click();

      // Deselect all environments
      await page.getByText('Deselect All').click();
    });

    await test.step('Verify export button is disabled when no environments selected', async () => {
      // Verify export button is disabled
      await expect(page.getByRole('button', { name: 'Export Environments' })).toBeDisabled();
    });
  });
});
