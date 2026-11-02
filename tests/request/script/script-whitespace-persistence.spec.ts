import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { bruToJsonV2 } from '@usebruno/lang';
import { expect, test } from '../../../playwright';
import {
  closeAllTabs,
  openRequest,
  readScriptContent,
  saveRequest,
  selectRequestPaneTab,
  selectScriptSubTab,
  setCodeMirrorEditorValue
} from '../../utils/page/actions';

const REQUEST_NAME = 'script-whitespace';

const PRE_REQUEST_SCRIPT = '\nbru.setVar("startedAt", 1)\n\n';
const TEST_SCRIPT = '\ntest("passes", function () {\n  expect(1).to.equal(1)\n})\n\n';

type RequestYml = {
  runtime?: {
    scripts?: { type: string; code: string }[];
  };
};

const FORMATS = [
  { format: 'bru', collectionName: 'ScriptWhitespaceBru' },
  { format: 'yml', collectionName: 'ScriptWhitespaceYml' }
] as const;

test('a script keeps the blank lines around it when the request is saved', async ({
  pageWithUserData: page,
  collectionFixturePath
}) => {
  for (const { format, collectionName } of FORMATS) {
    await test.step(`.${format} request`, async () => {
      await openRequest(page, collectionName, REQUEST_NAME);

      await selectScriptSubTab(page, 'pre-request');
      await setCodeMirrorEditorValue(page, 'pre-request-script-editor', PRE_REQUEST_SCRIPT);

      await selectRequestPaneTab(page, 'Tests');
      await setCodeMirrorEditorValue(page, 'test-script-editor', TEST_SCRIPT);

      await saveRequest(page);

      await closeAllTabs(page);
      await openRequest(page, collectionName, REQUEST_NAME);

      expect(await readScriptContent(page, 'pre-request')).toBe(PRE_REQUEST_SCRIPT);
      expect(await readScriptContent(page, 'tests')).toBe(TEST_SCRIPT);

      const requestFilePath = path.join(collectionFixturePath!, format, `${REQUEST_NAME}.${format}`);
      const fileContent = fs.readFileSync(requestFilePath, 'utf8');

      if (format === 'bru') {
        const parsed = bruToJsonV2(fileContent) as { script?: Record<string, string>; tests?: string };
        expect(parsed.script?.req).toBe(PRE_REQUEST_SCRIPT);
        expect(parsed.tests).toBe(TEST_SCRIPT);
      } else {
        const scripts = (yaml.load(fileContent) as RequestYml).runtime?.scripts ?? [];
        expect(scripts).toEqual(
          expect.arrayContaining([
            { type: 'before-request', code: PRE_REQUEST_SCRIPT },
            { type: 'tests', code: TEST_SCRIPT }
          ])
        );
      }
    });
  }
});
