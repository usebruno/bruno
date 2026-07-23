import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections, importCollection } from '../../utils/page';

// End-to-end coverage for the Postman -> Bruno pm.sendRequest() promise-chain
// translation fix. Importing writes the translated scripts to disk (YAML), so we
// read the generated request files and assert the chains were translated:
//   - the whole chain is awaited (not just the inner call)
//   - response.json()/.code map to response.data/.status inside .then handlers
//   - .catch/.finally handlers and nested chains are preserved
//   - a nested sendRequest inside a .then makes that handler async
test.describe('Import Postman Collection - pm.sendRequest promise chains', () => {
  const collectionName = 'SendRequest Promise Chains';

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('translates pm.sendRequest promise chains during import', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-sendrequest-promise-chains.json');
    const collectionDir = await createTmpDir('postman-sendrequest-promise-chains');

    await importCollection(page, postmanFile, collectionDir, { expectedCollectionName: collectionName });

    const readRequestFile = (requestName: string) =>
      fs.readFileSync(path.join(collectionDir, collectionName, `${requestName}.yml`), 'utf8');

    await test.step('translates a .then().catch().finally() chain and awaits the whole chain', () => {
      const content = readRequestFile('Promise Then Catch Finally');

      // Whole chain is awaited, not just the inner call: `await bru.sendRequest(...)` then `.then`
      expect(content).toContain('await bru.sendRequest({ url: \'https://jsonplaceholder.typicode.com/posts/1\' })');
      expect(content).toContain('.then((response) => {');
      // response.json() -> response.data inside the .then handler
      expect(content).toContain('console.log(response.data);');
      // .catch and .finally handlers survive untouched
      expect(content).toContain('.catch((error) => {');
      expect(content).toContain('.finally(() => {');
      expect(content).toContain('console.log(\'done\');');

      // The Postman API and its response methods must be gone
      expect(content).not.toContain('pm.sendRequest');
      expect(content).not.toContain('response.json()');
      // The buggy form (await wrapping only the inner call) must not appear
      expect(content).not.toContain('(await bru.sendRequest');
    });

    await test.step('handles nested .then() chains with a concise arrow body', () => {
      const content = readRequestFile('Nested Then Chains');

      expect(content).toContain('await bru.sendRequest({ url: \'https://jsonplaceholder.typicode.com/posts/1\' })');
      // concise arrow body: response.json() -> response.data
      expect(content).toContain('.then((response) => response.data)');
      // second .then in the chain is preserved
      expect(content).toContain('.then((data) => {');
      expect(content).toContain('console.log(data.title);');
      expect(content).toContain('.catch((error) => {');

      expect(content).not.toContain('pm.sendRequest');
      expect(content).not.toContain('response.json()');
      expect(content).not.toContain('(await bru.sendRequest');
    });

    await test.step('translates a sendRequest nested inside a .then and makes that handler async', () => {
      const content = readRequestFile('SendRequest Inside SendRequest');

      // Outer chain awaited
      expect(content).toContain('await bru.sendRequest({ url: \'https://jsonplaceholder.typicode.com/users/1\' })');
      // The .then handler that contains a nested awaited sendRequest becomes async
      expect(content).toContain('.then(async userRes => {');
      // Response remapping in the outer handler
      expect(content).toContain('const userId = userRes.data.id;');
      // Inner sendRequest chain is awaited via `return await`
      expect(content).toContain('return await bru.sendRequest(');
      // Response remapping in the inner handler
      expect(content).toContain('console.log(postsRes.data);');
      expect(content).toContain('.catch((error) => {');

      expect(content).not.toContain('pm.sendRequest');
      expect(content).not.toContain('.json()');
    });
  });
});
