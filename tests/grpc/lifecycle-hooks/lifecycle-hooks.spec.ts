import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { bruToJsonV2 } from '@usebruno/lang';
import { expect, test } from '../../../playwright';
import {
  addGrpcHookScript,
  closeAllTabs,
  createCollection,
  createRequest,
  openRequest,
  readGrpcHookScript,
  saveRequest
} from '../../utils/page/actions';

// Only persistence is tested here. Refer ../run-lifecycle-hooks for script runtime and API testing.
const REQUEST_NAME = 'grpc-lifecycle-hooks';
const GRPC_URL = 'localhost:50051';
const BEFORE_CALL_START = 'bru.setVar(\'startedAt\', 1);';
const AFTER_CALL_END = 'bru.setVar(\'endedAt\', 2);';

type GrpcRequestYml = {
  runtime?: {
    scripts?: { type: string; code: string }[];
  };
};

const FORMATS = [
  { format: 'bru', collectionName: 'grpc-bru-hooks', tmpDirPrefix: 'grpc-bru-hooks' },
  { format: 'yml', collectionName: 'grpc-yml-hooks', tmpDirPrefix: 'grpc-yml-hooks' }
] as const;

for (const { format, collectionName, tmpDirPrefix } of FORMATS) {
  test.describe.serial(`grpc lifecycle hooks (${format} format)`, () => {
    let collectionPath: string;

    test('authors both hooks on a gRPC request and saves them', async ({ page, createTmpDir }) => {
      collectionPath = await createTmpDir(tmpDirPrefix);

      await createCollection(page, collectionName, collectionPath, format);
      await createRequest(page, REQUEST_NAME, collectionName, { url: GRPC_URL, requestType: 'grpc' });

      await addGrpcHookScript(page, 'before-call-start', BEFORE_CALL_START);
      await addGrpcHookScript(page, 'after-call-end', AFTER_CALL_END);
      await saveRequest(page);

      await test.step('reopening the request shows both hooks', async () => {
        await closeAllTabs(page);
        await openRequest(page, collectionName, REQUEST_NAME);

        expect(await readGrpcHookScript(page, 'before-call-start')).toBe(BEFORE_CALL_START);
        expect(await readGrpcHookScript(page, 'after-call-end')).toBe(AFTER_CALL_END);
      });
    });

    test(`writes both hooks to the request .${format} file`, async () => {
      const requestFilePath = path.join(collectionPath, collectionName, `${REQUEST_NAME}.${format}`);
      expect(fs.existsSync(requestFilePath)).toBe(true);

      const fileContent = fs.readFileSync(requestFilePath, 'utf8');

      if (format === 'bru') {
        expect(fileContent).toContain('script:grpc:before-call-start {');
        expect(fileContent).toContain('script:grpc:after-call-end {');

        const parsed = bruToJsonV2(fileContent) as { script?: Record<string, string> };
        expect(parsed.script?.beforeCallStart).toBe(BEFORE_CALL_START);
        expect(parsed.script?.afterCallEnd).toBe(AFTER_CALL_END);
      } else {
        const scripts = (yaml.load(fileContent) as GrpcRequestYml).runtime?.scripts ?? [];
        expect(scripts).toEqual(
          expect.arrayContaining([
            { type: 'grpc:before-call-start', code: BEFORE_CALL_START },
            { type: 'grpc:after-call-end', code: AFTER_CALL_END }
          ])
        );
      }
    });
  });
}
