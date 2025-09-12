import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';

// Type declarations for test mode
declare global {
  interface Window {
    __BRUNO_TEST_MODE__?: boolean;
    __BRUNO_EXPORT_ALL_RESULT__?: {
      files: Array<{
        fileName: string;
        content: string;
        format: 'bru';
      }>;
    };
  }
}

test.use({
  contextOptions: {
    acceptDownloads: true // prevent native file dialog
  }
});

test.describe('Global Environments - Export All', () => {
  test('should export all global environments as BRU files and validate content', async ({
    pageWithUserData: page
  }) => {
    test.setTimeout(60 * 1000);

    // enable test mode BEFORE app loads
    await page.addInitScript(() => {
      window.__BRUNO_TEST_MODE__ = true;
    });
    await page.reload();

    // create a temp folder for export
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // open the collection
    await expect(page.getByTitle('global-environments-test', { exact: true })).toBeVisible();
    await page.getByTitle('global-environments-test', { exact: true }).click();

    // open the dropdown
    await page.locator('#GlobalEnvironmentsToolhintId').click();

    // click the config option
    await page.locator('.environment-selector-configure').click();

    // verify export all button is visible
    await expect(page.locator('.btn-import-environment').getByText('Export All')).toBeVisible();

    // click the export all button
    await page.locator('.btn-import-environment').getByText('Export All').click();

    // verify both JSON and BRU formats are available
    await expect(page.locator('.json-format-label')).toBeVisible();
    await expect(page.locator('.bru-format-label')).toBeVisible();
    await expect(page.locator('input[value="json"]')).toBeChecked();

    // click bru format
    await page.locator('.bru-format-label').click();
    await expect(page.locator('input[value="bru"]')).toBeChecked();

    // trigger export
    await page.locator('.export-modal-export').click();

    // grab the result from the injected global
    const exportResult = await page.evaluate(() => window.__BRUNO_EXPORT_ALL_RESULT__);
    expect(exportResult).toBeDefined();
    expect(exportResult!.files).toBeDefined();
    expect(Array.isArray(exportResult!.files)).toBe(true);
    expect(exportResult!.files.length).toBeGreaterThan(0);

    // Verify each exported file contains valid BRU content
    for (const file of exportResult!.files) {
      expect(file.format).toBe('bru');
      expect(file.fileName).toContain('.bru');

      // Verify BRU file structure
      expect(file.content).toContain('vars {');
      expect(file.content).toContain('}');

      // Verify it contains environment variables
      const lines = file.content.split('\n');
      const varsSection = lines.findIndex((line) => line.trim() === 'vars {');
      expect(varsSection).toBeGreaterThan(-1);

      // Save to temp directory for additional validation
      const filePath = path.join(tempDir, file.fileName);
      fs.writeFileSync(filePath, file.content, 'utf-8');
      expect(fs.existsSync(filePath)).toBe(true);
    }

    // cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should export all global environments as JSON and validate content', async ({ pageWithUserData: page }) => {
    test.setTimeout(60 * 1000);

    // enable test mode BEFORE app loads
    await page.addInitScript(() => {
      window.__BRUNO_TEST_MODE__ = true;
    });
    await page.reload();

    // create a temp folder for export
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // open the collection
    await expect(page.getByTitle('global-environments-test', { exact: true })).toBeVisible();
    await page.getByTitle('global-environments-test', { exact: true }).click();

    // open the dropdown
    await page.locator('#GlobalEnvironmentsToolhintId').click();

    // click the config option
    await page.locator('.environment-selector-configure').click();

    // verify export all button is visible
    await expect(page.locator('.btn-import-environment').getByText('Export All')).toBeVisible();

    // click the export all button
    await page.locator('.btn-import-environment').getByText('Export All').click();

    // verify both JSON and BRU formats are available
    await expect(page.locator('.json-format-label')).toBeVisible();
    await expect(page.locator('.bru-format-label')).toBeVisible();
    await expect(page.locator('input[value="json"]')).toBeChecked();

    // click json format
    await page.locator('.json-format-label').click();
    await expect(page.locator('input[value="json"]')).toBeChecked();

    // trigger export
    await page.locator('.export-modal-export').click();

    // grab the result from the injected global
    const exportResult = await page.evaluate(() => window.__BRUNO_EXPORT_ALL_RESULT__);
    expect(exportResult).toBeDefined();
    expect(exportResult!.files).toBeDefined();
    expect(Array.isArray(exportResult!.files)).toBe(true);
    expect(exportResult!.files.length).toBeGreaterThan(0);

    // Verify each exported file contains valid JSON content
    for (const file of exportResult!.files) {
      expect(file.format).toBe('json');
      expect(file.fileName).toContain('.json');

      // Parse and validate JSON content
      const parsed = JSON.parse(file.content);

      // Check if it's an array of environments (export-all format) or single environment
      if (Array.isArray(parsed)) {
        // Handle array of environments
        expect(parsed.length).toBeGreaterThan(0);

        for (const environment of parsed) {
          expect(environment).toHaveProperty('name');
          expect(environment).toHaveProperty('variables');
          expect(Array.isArray(environment.variables)).toBe(true);

          if (environment.variables.length > 0) {
            const variable = environment.variables[0];
            expect(variable).toHaveProperty('name');
            expect(variable).toHaveProperty('value');
            expect(variable).toHaveProperty('type');
            expect(variable).toHaveProperty('enabled');
            expect(variable).toHaveProperty('secret');
          }
        }
      } else {
        // Handle single environment
        expect(parsed).toHaveProperty('name');
        expect(parsed).toHaveProperty('variables');
        expect(Array.isArray(parsed.variables)).toBe(true);

        if (parsed.variables.length > 0) {
          const variable = parsed.variables[0];
          expect(variable).toHaveProperty('name');
          expect(variable).toHaveProperty('value');
          expect(variable).toHaveProperty('type');
          expect(variable).toHaveProperty('enabled');
          expect(variable).toHaveProperty('secret');
        }
      }

      // Save to temp directory for additional validation
      const filePath = path.join(tempDir, file.fileName);
      fs.writeFileSync(filePath, file.content, 'utf-8');
      expect(fs.existsSync(filePath)).toBe(true);
    }

    // cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
