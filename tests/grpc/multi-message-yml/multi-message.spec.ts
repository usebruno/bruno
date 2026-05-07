import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { bruToJsonV2 } from '@usebruno/lang';
import { expect, test } from '../../../playwright';
import {
  addGrpcMessage,
  createCollection,
  createRequest,
  generateGrpcSampleMessage,
  REQUEST_TYPE,
  saveRequest,
  selectGrpcMethod
} from '../../utils/page/actions';

const REQUEST_NAME = 'grpc-multi-msg';
const GRPC_URL = 'grpcb.in:9000';
const GRPC_METHOD = 'BidiHello';

type GrpcRequestYml = {
  grpc?: {
    message?: { title: string; message: string }[];
  };
};

const FORMATS = [
  { format: 'yml', collectionName: 'grpc-yml-multi-msg', tmpDirPrefix: 'grpc-yml-collection' },
  { format: 'bru', collectionName: 'grpc-bru-multi-msg', tmpDirPrefix: 'grpc-bru-collection' }
] as const;

for (const { format, collectionName, tmpDirPrefix } of FORMATS) {
  test.describe.serial(`grpc multi-message (${format} format)`, () => {
    let collectionPath: string;

    test('creates a gRPC request with multiple messages and saves it', async ({ page, createTmpDir }) => {
      collectionPath = await createTmpDir(tmpDirPrefix);

      await createCollection(page, collectionName, collectionPath, { format });
      await createRequest(page, REQUEST_NAME, collectionName, { url: GRPC_URL, requestType: REQUEST_TYPE.GRPC });

      await selectGrpcMethod(page, GRPC_METHOD);

      await addGrpcMessage(page);
      await addGrpcMessage(page);

      await generateGrpcSampleMessage(page, 0);
      await generateGrpcSampleMessage(page, 1);
      await generateGrpcSampleMessage(page, 2);

      await saveRequest(page);
    });

    test(`verifies all messages are saved in the request .${format} file`, async () => {
      const requestFilePath = path.join(collectionPath, collectionName, `${REQUEST_NAME}.${format}`);
      expect(fs.existsSync(requestFilePath)).toBe(true);

      const fileContent = fs.readFileSync(requestFilePath, 'utf8');

      if (format === 'yml') {
        const parsed = yaml.load(fileContent) as GrpcRequestYml;
        const messages = parsed.grpc?.message ?? [];
        expect(messages.length).toBe(3);
      } else if (format === 'bru') {
        const parsed = bruToJsonV2(fileContent) as { body?: { grpc?: { name: string; content: string }[] } };
        const messages = parsed.body?.grpc ?? [];
        expect(messages.length).toBe(3);
      }
    });
  });
}
