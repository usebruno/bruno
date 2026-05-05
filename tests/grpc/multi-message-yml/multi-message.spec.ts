import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { expect, test } from '../../../playwright';
import {
  addGrpcMessage,
  createCollection,
  createRequest,
  generateGrpcSampleMessage,
  saveRequest,
  selectGrpcMethod
} from '../../utils/page/actions';

const COLLECTION_NAME = 'grpc-yml-multi-msg';
const REQUEST_NAME = 'grpc-multi-msg';
const GRPC_URL = 'grpcb.in:9000';
const GRPC_METHOD = 'BidiHello';
const MESSAGE_COUNT = 3;

type GrpcRequestYml = {
  grpc?: {
    message?: { title: string; message: string }[];
  };
};

test.describe.serial('grpc multi-message (yml format)', () => {
  let collectionPath: string;

  test('creates a gRPC request with multiple messages and saves it', async ({ page, createTmpDir }) => {
    collectionPath = await createTmpDir('grpc-yml-collection');
    await createCollection(page, COLLECTION_NAME, collectionPath);
    await createRequest(page, REQUEST_NAME, COLLECTION_NAME, { url: GRPC_URL, requestType: 'gRPC' });

    await selectGrpcMethod(page, GRPC_METHOD);

    await addGrpcMessage(page);
    await addGrpcMessage(page);

    await generateGrpcSampleMessage(page, 0);
    await generateGrpcSampleMessage(page, 1);
    await generateGrpcSampleMessage(page, 2);

    await saveRequest(page);
  });

  test('verifies all messages are saved in the request .yml file', async () => {
    const requestFilePath = path.join(collectionPath, COLLECTION_NAME, `${REQUEST_NAME}.yml`);
    expect(fs.existsSync(requestFilePath)).toBe(true);

    const parsed = yaml.load(fs.readFileSync(requestFilePath, 'utf8')) as GrpcRequestYml;
    const messages = parsed.grpc?.message ?? [];

    expect(messages).toHaveLength(MESSAGE_COUNT);
    for (const variant of messages) {
      expect(variant.title?.length ?? 0).toBeGreaterThan(0);
      expect(variant.message?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
