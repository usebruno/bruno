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

    expect(yamlContent).toContain(`  params:
    - name: date
      value: 2024-01-01
      type: query
    - name: is_active
      value: "false"
      type: query
    - name: limit
      value: "0"
      type: query
    - name: version
      value: "2.0"
      type: query
    - name: count
      value: "42"
      type: query
`);

    const envFilePath = path.join(collectionDir, collectionName, 'environments', 'Base.yml');
    const envContent = fs.readFileSync(envFilePath, 'utf8');

    expect(envContent).toContain(`variables:
  - name: expiry_date
    value: 2024-12-31
  - name: max_retries
    value: "3"
  - name: enabled
    value: "true"
`);
  });
});
