import { test, expect } from '../../../playwright';
import path from 'path';
import fs from 'fs';

test.describe('Export Collection Environments', () => {
  test('should export single collection environment as bru and json formats', async ({
    pageWithUserData: page,
    createTmpDir
  }) => {
    // create temporary directory for exports
    const exportDir = await createTmpDir('environment-export-test');

    // open the collection and configure environments
    await expect(page.getByTitle('export-environment-test')).toBeVisible();
    await page.getByTitle('export-environment-test').click();
    await page.locator('div.current-environment').click();
    await page.getByText('Configure', { exact: true }).click();

    // test bru format export
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('radio', { name: 'bru' }).check();

    const locationInput = page.locator('#export-location');
    await locationInput.fill(exportDir);
    await page.locator('.btn-export.export-modal-export').click();

    // verify bru file was created and has correct content
    const bruFilePath = path.join(exportDir, 'Test_Environment.bru');
    expect(fs.existsSync(bruFilePath)).toBe(true);
    const bruContent = fs.readFileSync(bruFilePath, 'utf8');
    expect(bruContent).toContain('vars {');
    expect(bruContent).toContain('api_url: https://api.test.com');
    expect(bruContent).toContain('timeout: 5000');

    // test json format export
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('radio', { name: 'json' }).check();
    await locationInput.fill(exportDir);
    await page.locator('.btn-export.export-modal-export').click();

    // verify json file was created and has correct content
    const jsonFilePath = path.join(exportDir, 'Test_Environment.json');
    expect(fs.existsSync(jsonFilePath)).toBe(true);
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const jsonData = JSON.parse(jsonContent);
    expect(jsonData.name).toBe('Test Environment');
    expect(jsonData.variables).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'api_url',
        value: 'https://api.test.com',
        enabled: true,
        secret: false
      }),
      expect.objectContaining({
        name: 'timeout',
        value: '5000',
        enabled: true,
        secret: false
      })
    ]));
  });

  test('should export all collection environments as bru and json formats', async ({
    pageWithUserData: page,
    createTmpDir
  }) => {
    // create temp directory
    const exportDir = await createTmpDir('all-environments-export-test');

    // open collection
    await page.getByTitle('export-environment-test').click();
    await page.locator('div.current-environment').click();
    await page.getByText('Configure', { exact: true }).click();

    // export as bru
    await page.locator('div.export-all-button').click();

    const locationInput = page.locator('#export-all-location');
    await locationInput.fill(exportDir);
    await page.locator('.btn-export.export-modal-export').click();

    // check bru files
    const testEnv1Path = path.join(exportDir, 'Test Environment.bru');
    const testEnv2Path = path.join(exportDir, 'Test Environment 2.bru');

    expect(fs.existsSync(testEnv1Path)).toBe(true);
    expect(fs.existsSync(testEnv2Path)).toBe(true);

    const env1Content = fs.readFileSync(testEnv1Path, 'utf8');
    const env2Content = fs.readFileSync(testEnv2Path, 'utf8');
    expect(env1Content).toContain('api_url: https://api.test.com');
    expect(env1Content).toContain('timeout: 5000');
    expect(env2Content).toContain('api_url: https://api.test2.com');
    expect(env2Content).toContain('timeout: 3000');

    // export as json
    await page.locator('div.export-all-button').click();
    await page.getByRole('radio', { name: 'json' }).check();
    await locationInput.fill(exportDir);
    await page.locator('.btn-export.export-modal-export').click();

    // check json files
    const testEnv1JsonPath = path.join(exportDir, 'Test Environment.json');
    const testEnv2JsonPath = path.join(exportDir, 'Test Environment 2.json');

    expect(fs.existsSync(testEnv1JsonPath)).toBe(true);
    expect(fs.existsSync(testEnv2JsonPath)).toBe(true);

    const env1JsonData = JSON.parse(fs.readFileSync(testEnv1JsonPath, 'utf8'));
    const env2JsonData = JSON.parse(fs.readFileSync(testEnv2JsonPath, 'utf8'));

    expect(env1JsonData.name).toBe('Test Environment');
    expect(env1JsonData.variables).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'api_url',
        value: 'https://api.test.com',
        enabled: true,
        secret: false
      }),
      expect.objectContaining({
        name: 'timeout',
        value: '5000',
        enabled: true,
        secret: false
      })
    ]));

    expect(env2JsonData.name).toBe('Test Environment 2');
    expect(env2JsonData.variables).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'api_url',
        value: 'https://api.test2.com',
        enabled: true,
        secret: false
      }),
      expect.objectContaining({
        name: 'timeout',
        value: '3000',
        enabled: true,
        secret: false
      })
    ]));
  });
});
