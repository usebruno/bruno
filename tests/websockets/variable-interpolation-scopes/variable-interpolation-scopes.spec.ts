import { expect, test } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  closeAllCollections,
  expandCollection,
  expandFolder,
  openRequest,
  selectEnvironment
} from '../../utils/page/actions';
import { disconnectWs } from '../../utils/page/websocket';

const ENVIRONMENT_NAME = 'Scopes';
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

test.describe.serial('websocket variable interpolation across scopes', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  for (const fmt of FORMATS) {
    for (const c of CASES) {
      test(`(${fmt.label}) ${c.id}: ${c.title}`, { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
        const { websocket, runner, tabs } = buildCommonLocators(page);

        await expandCollection(page, fmt.collectionName);
        await expandFolder(page, fmt.folderName);
        await openRequest(page, fmt.collectionName, c.requestName);
        await expect(tabs.activeRequestTab()).toContainText(c.requestName);
        await selectEnvironment(page, ENVIRONMENT_NAME, 'collection');

        await runner().click();
        await expect(websocket.connectionControls.disconnect()).toBeAttached({
          timeout: MAX_CONNECTION_TIME
        });

        const payload = websocket.messageMatching(c.findBy);
        await expect(payload).toBeAttached({ timeout: MAX_CONNECTION_TIME });

        for (const text of c.expectIncludes) {
          await expect(payload).toContainText(text);
        }
        for (const text of c.expectExcludes) {
          await expect(payload).not.toContainText(text);
        }

        await disconnectWs(page);
      });
    }
  }
});
