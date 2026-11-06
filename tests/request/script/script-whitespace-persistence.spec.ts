import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { bruToJsonV2 } from '@usebruno/lang';
import { expect, test } from '../../../playwright';
import { appendBlankLineToScript, closeAllTabs, openRequest, readScriptContent, saveRequest } from '../../utils/page';

const REQUEST_NAME = 'script-whitespace';

const FIXTURE_PRE_REQUEST_SCRIPT = '\nbru.setVar("startedAt", 1)\n';
const FIXTURE_TEST_SCRIPT = '\ntest("passes", function () {\n  expect(1).to.equal(1)\n})\n';

const EDITED_PRE_REQUEST_SCRIPT = `${FIXTURE_PRE_REQUEST_SCRIPT}\n`;
const EDITED_TEST_SCRIPT = `${FIXTURE_TEST_SCRIPT}\n`;

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

      expect(await readScriptContent(page, 'pre-request')).toBe(FIXTURE_PRE_REQUEST_SCRIPT);
      expect(await readScriptContent(page, 'tests')).toBe(FIXTURE_TEST_SCRIPT);

      await appendBlankLineToScript(page, 'pre-request');
      await appendBlankLineToScript(page, 'tests');

      await saveRequest(page);

      await closeAllTabs(page);
      await openRequest(page, collectionName, REQUEST_NAME);

      expect(await readScriptContent(page, 'pre-request')).toBe(EDITED_PRE_REQUEST_SCRIPT);
      expect(await readScriptContent(page, 'tests')).toBe(EDITED_TEST_SCRIPT);

      const requestFilePath = path.join(collectionFixturePath!, format, `${REQUEST_NAME}.${format}`);
      const fileContent = fs.readFileSync(requestFilePath, 'utf8');

      if (format === 'bru') {
        const parsed = bruToJsonV2(fileContent) as { script?: Record<string, string>; tests?: string };
        expect(parsed.script?.req).toBe(EDITED_PRE_REQUEST_SCRIPT);
        expect(parsed.tests).toBe(EDITED_TEST_SCRIPT);
      } else {
        const scripts = (yaml.load(fileContent) as RequestYml).runtime?.scripts ?? [];
        expect(scripts).toEqual(
          expect.arrayContaining([
            { type: 'before-request', code: EDITED_PRE_REQUEST_SCRIPT },
            { type: 'tests', code: EDITED_TEST_SCRIPT }
          ])
        );
      }
    });
  }
});
