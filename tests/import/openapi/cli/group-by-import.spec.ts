import { test, expect } from '../../../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test.describe('OpenAPI Import GroupBy Tests', () => {
  test('CLI: Import OpenAPI with tags grouping', async ({ createTmpDir }) => {
    const outputDir = await createTmpDir('openapi-tags');
    const jsonOutputPath = path.join(outputDir, 'petstore-tags.json');

    // Run OpenAPI import with tags grouping using JSON output
    const cliPath = path.resolve(__dirname, '../../../../packages/bruno-cli/bin/bru.js');
    const specPath = path.resolve(__dirname, './fixtures/openapi.json');
    const command = `node "${cliPath}" import openapi --source "${specPath}" --output-file "${jsonOutputPath}" --collection-name "Simple API (Tags)" --group-by tags`;

    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      // Continue with test even if import fails
    }

    // Verify JSON file was created
    expect(fs.existsSync(jsonOutputPath)).toBe(true);

    // Read and verify collection structure
    const jsonCollection = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));
    expect(jsonCollection.name).toBe('Simple API (Tags)');

    // Verify tags grouping creates folders by OpenAPI tags
    const folders = jsonCollection.items.filter((item) => item.type === 'folder');
    expect(folders.length).toBe(3);

    const folderNames = folders.map((folder) => folder.name);
    expect(folderNames).toContain('users');
    expect(folderNames).toContain('products');
    expect(folderNames).toContain('orders');

    // Verify tags grouping doesn't create {id} folders
    const hasIdFolders = folders.some((folder) => folder.items?.some((item) => item.name === '{id}'));
    expect(hasIdFolders).toBe(false);
  });

  test('CLI: Import OpenAPI with path grouping', async ({ createTmpDir }) => {
    const outputDir = await createTmpDir('openapi-path');
    const jsonOutputPath = path.join(outputDir, 'petstore-path.json');

    // Run OpenAPI import with path grouping using JSON output
    const cliPath = path.resolve(__dirname, '../../../../packages/bruno-cli/bin/bru.js');
    const specPath = path.resolve(__dirname, './fixtures/openapi.json');
    const command = `node "${cliPath}" import openapi --source "${specPath}" --output-file "${jsonOutputPath}" --collection-name "Simple API (Path)" --group-by path`;

    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      // Continue with test even if import fails
    }

    // Verify JSON file was created
    expect(fs.existsSync(jsonOutputPath)).toBe(true);

    // Read and verify collection structure
    const jsonCollection = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));
    expect(jsonCollection.name).toBe('Simple API (Path)');

    // Verify path grouping creates folders by URL path structure
    const folders = jsonCollection.items.filter((item) => item.type === 'folder');
    expect(folders.length).toBe(3); // users, products, orders

    const folderNames = folders.map((folder) => folder.name);
    expect(folderNames).toContain('users');
    expect(folderNames).toContain('products');
    expect(folderNames).toContain('orders');

    // Verify path grouping creates {id} folders for parameterized paths
    const hasIdFolders = folders.some((folder) => folder.items?.some((item) => item.name === '{id}'));
    expect(hasIdFolders).toBe(true);
  });
});
