import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections, importCollection } from '../../utils/page';

test.describe('Import Insomnia Collection - date types preserved', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should keep date-like strings and quoted values intact through the full FileTab.js import flow', async ({
    page,
    createTmpDir
  }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v5-dates.yaml');
    const collectionName = 'Date Type Test';
    const collectionDir = await createTmpDir('insomnia-dates-test');

    await importCollection(page, insomniaFile, collectionDir, {
      expectedCollectionName: collectionName
    });

    const requestFilePath = path.join(collectionDir, collectionName, 'Date Request.yml');
    const yamlContent = fs.readFileSync(requestFilePath, 'utf8');

    expect(yamlContent).toContain('value: 2024-01-01');
    expect(yamlContent).not.toContain('Mon Jan');
    expect(yamlContent).not.toContain('GMT');

    expect(yamlContent).toMatch(/value:\s*"false"/);
    expect(yamlContent).toMatch(/value:\s*"0"/);
    expect(yamlContent).toMatch(/value:\s*"2\.0"/);
    expect(yamlContent).toContain('value: "42"');
  });
});
