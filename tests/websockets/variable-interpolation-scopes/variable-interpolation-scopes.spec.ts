import { expect, test } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { expandCollection, expandFolder, openRequest, selectEnvironment } from '../../utils/page/actions';

const COLLECTION_ENVIRONMENT_NAME = 'scopes';
const GLOBAL_ENVIRONMENT_NAME = 'ws-global';
const MAX_CONNECTION_TIME = 10000;

const FORMATS = [
  { label: 'bru' as const, collectionName: 'ws-var-scopes-bru', folderName: 'ws-scopes-bru' },
  { label: 'yml' as const, collectionName: 'ws-var-scopes-yml', folderName: 'ws-scopes-yml' }
];

type ScopeCase = {
  id: string;
  title: string;
  requestName: string;
  findBy: string;
  expectIncludes: string[];
  expectExcludes: string[];
};

const CASES: ScopeCase[] = [
  {
    id: 'TC-905',
    title: 'Variable interpolation in nested JSON objects with multiple variable sources',
    requestName: 'ws-nested-json',
    findBy: 'user123',
    expectIncludes: ['user123', 'TestCorp', 'QA', 'US', '"user"', '"metadata"', '"location"'],
    expectExcludes: ['{{userId}}', '{{companyName}}', '{{qaTeam}}', '{{region}}']
  },
  {
    id: 'TC-906',
    title: 'Multiple variable interpolation within single text message',
    requestName: 'ws-multi-text-vars',
    findBy: 'TestFolder - TestCollection - TestEnvironment - TestGlobal',
    expectIncludes: ['TestFolder - TestCollection - TestEnvironment - TestGlobal'],
    expectExcludes: ['{{folderName}}', '{{collectionName}}', '{{environmentName}}', '{{globalName}}']
  },
  {
    id: 'TC-907',
    title: 'Variable interpolation in complex nested XML structures',
    requestName: 'ws-nested-xml',
    findBy: 'North America',
    expectIncludes: [
      'HQ',
      'North America',
      'Engineering',
      'DC-02',
      '1.0',
      '<organization',
      '<region',
      '<infrastructure>'
    ],
    expectExcludes: ['{{orgUnit}}', '{{xmlRegion}}', '{{department}}', '{{dataCenter}}', '{{version}}']
  }
];

test.describe('websocket variable interpolation across scopes', () => {
  for (const format of FORMATS) {
    for (const testCase of CASES) {
      test(`${testCase.id}: ${testCase.title} (${format.label})`, { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
        const { websocket } = buildCommonLocators(page);

        await expandCollection(page, format.collectionName);
        await expandFolder(page, format.folderName);
        await openRequest(page, format.collectionName, testCase.requestName);
        await selectEnvironment(page, COLLECTION_ENVIRONMENT_NAME, 'collection');
        await selectEnvironment(page, GLOBAL_ENVIRONMENT_NAME, 'global');

        await websocket.runButton().click();
        const payload = websocket.incomingMessageMatching(testCase.findBy);

        await test.step('Assert resolved values and no leftover placeholders', async () => {
          for (const text of testCase.expectIncludes) {
            await expect(payload).toContainText(text, { timeout: MAX_CONNECTION_TIME });
          }
          for (const text of testCase.expectExcludes) {
            await expect(payload).not.toContainText(text);
          }
        });
      });
    }
  }
});
