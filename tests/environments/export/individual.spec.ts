import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';

// Type declarations for test mode
declare global {
  interface Window {
    __BRUNO_TEST_MODE__?: boolean;
    __BRUNO_EXPORT_RESULT__?: {
      fileName: string;
      content: string;
      format: 'json' | 'bru';
    };
  }
}

test.use({
  contextOptions: {
    acceptDownloads: true // prevent native file dialog
  }
});

test.describe('Local Environments - Export Individual', () => {
  test('should export individual local environment as JSON and validate from file', async ({ pageWithUserData: page }) => {
    test.setTimeout(60 * 1000);

    // enable test mode BEFORE app loads
    await page.addInitScript(() => {
      window.__BRUNO_TEST_MODE__ = true;
    });
    await page.reload();

    // create a temp folder
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // open the collection
    await expect(page.getByTitle('local-environments-test')).toBeVisible();
    await page.getByTitle('local-environments-test').click();

    // open the dropdown
    await page.locator('.current-environment.collection-environment').click();

    // click the config option
    await page.locator('#Configure').click();

    // click the export button
    await page.locator('.environment-variables-export-btn').click();

    // click json format
    await page.locator('.json-format-label').click();

    // trigger export
    await page.locator('.export-modal-export').click();

    // grab the result from the injected global
    const exportResult = await page.evaluate(() => window.__BRUNO_EXPORT_RESULT__);
    expect(exportResult).toBeDefined();
    expect(exportResult!.format).toBe('json');

    // save it to disk
    const filePath = path.join(tempDir, exportResult!.fileName);
    fs.writeFileSync(filePath, exportResult!.content, 'utf-8');
    expect(fs.existsSync(filePath)).toBe(true);

    // read back and validate
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);

    // validate exact content/schema
    expect(parsed).toHaveProperty('name', 'Test Environment');
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

  });

  test('should export individual local environment as BRU and validate from file', async ({ pageWithUserData: page }) => {

    // reference temp folder
    const tempDir = path.join(__dirname, 'temp');

    // click the export button
    await page.locator('.environment-variables-export-btn').click();

    // click bru format
    await page.locator('.bru-format-label').click();

    // trigger export
    await page.locator('.export-modal-export').click();

    // grab the result from the injected global
    const exportResult = await page.evaluate(() => window.__BRUNO_EXPORT_RESULT__);
    expect(exportResult).toBeDefined();
    expect(exportResult!.format).toBe('bru');

    // save it to disk
    const filePath = path.join(tempDir, exportResult!.fileName);
    fs.writeFileSync(filePath, exportResult!.content, 'utf-8');
    expect(fs.existsSync(filePath)).toBe(true);

    // read back and validate
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // validate BRU file structure
    expect(fileContent).toContain('vars {');
    expect(fileContent).toContain('}');

    // verify it contains environment variables
    const lines = fileContent.split('\n');
    const varsSection = lines.findIndex(line => line.trim() === 'vars {');
    expect(varsSection).toBeGreaterThan(-1);

    // cleanup
    fs.unlinkSync(filePath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
