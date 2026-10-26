import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  getEchoedGraphqlQuery,
  getGraphqlQueryEditorValue,
  loadGraphqlSchemaFromFile,
  openGraphqlQueryBuilder,
  openRequest,
  sendRequest,
  setGraphqlQueryEditorValue,
  tickQueryBuilderField
} from '../../utils/page';

const DEEP_SCHEMA_PATH = path.join(__dirname, 'fixtures', 'deep-schema.graphql');
const LEVELS = Array.from({ length: 13 }, (_, i) => `level${String(i + 2).padStart(2, '0')}`);
const LEVEL_PATHS = LEVELS.reduce((paths, level) => [...paths, `${paths[paths.length - 1]}.${level}`], ['Query.deepTree']);
const LEVEL14_PATH = LEVEL_PATHS[LEVEL_PATHS.length - 1];
const DEEP_QUERY = `query DeepTree { deepTree { id depth name ${LEVELS.map((level) => `${level} { id depth name`).join(' ')} ${'} '.repeat(LEVELS.length)}} }`;

test.describe.serial('GraphQL Query Builder - deep nesting', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('Ticking a field 14 levels deep generates and sends the full query', async ({
    pageWithUserData: page,
    reuseOrLaunchElectronApp
  }, testInfo) => {
    const electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });

    await test.step('Open the echo request and load the deep schema', async () => {
      await openRequest(page, 'graphql-query-builder', 'deep-nesting-echo');
      await openGraphqlQueryBuilder(page);
      await loadGraphqlSchemaFromFile(page, electronApp, DEEP_SCHEMA_PATH, 'Query.deepTree');
    });

    await test.step('Tick deepTree and every level down to level14, then its "id"', async () => {
      for (const levelPath of LEVEL_PATHS) {
        await tickQueryBuilderField(page, levelPath);
      }
      await tickQueryBuilderField(page, `${LEVEL14_PATH}.id`);
    });

    await test.step('Verify the query reaches level14', async () => {
      await expect.poll(() => getGraphqlQueryEditorValue(page)).toMatch(/level14\s*\{\s*id\s*\}/);
      expect(await getGraphqlQueryEditorValue(page)).not.toMatch(/\{\s*\}/);
    });

    await test.step('Send to echo and verify the response has the same query', async () => {
      await sendRequest(page, 200);
      expect(await getEchoedGraphqlQuery(page)).toBe(await getGraphqlQueryEditorValue(page));
    });
  });

  test('Pasting a 14 level query ticks every level, survives a new tick and sends in full', async ({ pageWithUserData: page }) => {
    const { graphqlQueryBuilder } = buildCommonLocators(page);

    await test.step('Paste the deep query into the editor', async () => {
      await setGraphqlQueryEditorValue(page, DEEP_QUERY);
    });

    await test.step('Verify level14 and its fields are ticked', async () => {
      await expect(graphqlQueryBuilder.fieldCheckbox(LEVEL14_PATH)).toBeChecked();
      await expect(graphqlQueryBuilder.fieldCheckbox(`${LEVEL14_PATH}.name`)).toBeChecked();
    });

    await test.step('Tick "score" on deepTree', async () => {
      await tickQueryBuilderField(page, 'Query.deepTree.score');
      await expect.poll(() => getGraphqlQueryEditorValue(page)).toContain('score');
    });

    await test.step('Verify the regenerated query still reaches level14', async () => {
      expect(await getGraphqlQueryEditorValue(page)).toMatch(/level14\s*\{\s*id\s+depth\s+name\s*\}/);
    });

    await test.step('Send to echo and verify the response has the same query', async () => {
      await sendRequest(page, 200);
      const echoedQuery = await getEchoedGraphqlQuery(page);
      expect(echoedQuery).toBe(await getGraphqlQueryEditorValue(page));
      expect(echoedQuery).toMatch(/level14\s*\{\s*id\s+depth\s+name\s*\}/);
    });
  });
});
