import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { bruToJsonV2 } from '@usebruno/lang';
import { expect, test } from '../../../playwright';
import {
  closeAllTabs,
  createCollection,
  createRequest,
  openRequest,
  readScriptContent,
  saveRequest,
  writeScriptContent
} from '../../utils/page/actions';

const REQUEST_NAME = 'grpc-lifecycle-hooks';
const GRPC_URL = 'localhost:50051';

const BEFORE_CALL_START_SCRIPT = 'bru.setVar(\'startedAt\', 1);';
const AFTER_CALL_END_SCRIPT = 'bru.setVar(\'endedAt\', 2);';
const BEFORE_MESSAGE_SEND_SCRIPT = 'bru.setVar(\'sentAt\', bru.grpc.request.message.timestamp);';
const AFTER_MESSAGE_RECEIVE_SCRIPT = 'bru.setVar(\'receivedAt\', bru.grpc.response.message.timestamp);';

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

    test('authors every hook on a gRPC request and saves them', async ({ page, createTmpDir }) => {
      collectionPath = await createTmpDir(tmpDirPrefix);

      await createCollection(page, collectionName, collectionPath, format);
      await createRequest(page, REQUEST_NAME, collectionName, { url: GRPC_URL, requestType: 'grpc' });

      await writeScriptContent(page, 'before-call-start', BEFORE_CALL_START_SCRIPT);
      await writeScriptContent(page, 'after-call-end', AFTER_CALL_END_SCRIPT);
      await writeScriptContent(page, 'before-message-send', BEFORE_MESSAGE_SEND_SCRIPT);
      await writeScriptContent(page, 'after-message-receive', AFTER_MESSAGE_RECEIVE_SCRIPT);
      await saveRequest(page);

      await test.step('reopening the request shows every hook', async () => {
        await closeAllTabs(page);
        await openRequest(page, collectionName, REQUEST_NAME);

        expect(await readScriptContent(page, 'before-call-start')).toBe(BEFORE_CALL_START_SCRIPT);
        expect(await readScriptContent(page, 'after-call-end')).toBe(AFTER_CALL_END_SCRIPT);
        expect(await readScriptContent(page, 'before-message-send')).toBe(BEFORE_MESSAGE_SEND_SCRIPT);
        expect(await readScriptContent(page, 'after-message-receive')).toBe(AFTER_MESSAGE_RECEIVE_SCRIPT);
      });
    });

    test(`writes every hook to the request .${format} file`, async () => {
      const requestFilePath = path.join(collectionPath, collectionName, `${REQUEST_NAME}.${format}`);
      expect(fs.existsSync(requestFilePath)).toBe(true);

      const fileContent = fs.readFileSync(requestFilePath, 'utf8');

      if (format === 'bru') {
        expect(fileContent).toContain('script:grpc:before-call-start {');
        expect(fileContent).toContain('script:grpc:after-call-end {');
        expect(fileContent).toContain('script:grpc:before-message-send {');
        expect(fileContent).toContain('script:grpc:after-message-receive {');

        const parsed = bruToJsonV2(fileContent) as { script?: Record<string, string> };
        expect(parsed.script?.beforeCallStart).toBe(BEFORE_CALL_START_SCRIPT);
        expect(parsed.script?.afterCallEnd).toBe(AFTER_CALL_END_SCRIPT);
        expect(parsed.script?.beforeMessageSend).toBe(BEFORE_MESSAGE_SEND_SCRIPT);
        expect(parsed.script?.afterMessageReceive).toBe(AFTER_MESSAGE_RECEIVE_SCRIPT);
      } else {
        const scripts = (yaml.load(fileContent) as GrpcRequestYml).runtime?.scripts ?? [];
        expect(scripts).toHaveLength(4);
        expect(scripts).toEqual(
          expect.arrayContaining([
            { type: 'grpc:before-call-start', code: BEFORE_CALL_START_SCRIPT },
            { type: 'grpc:after-call-end', code: AFTER_CALL_END_SCRIPT },
            { type: 'grpc:before-message-send', code: BEFORE_MESSAGE_SEND_SCRIPT },
            { type: 'grpc:after-message-receive', code: AFTER_MESSAGE_RECEIVE_SCRIPT }
          ])
        );
      }
    });
  });
}
