import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { GrpcRequest, GrpcMetadata } from '@opencollection/types/requests/grpc';
import type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
import { toBrunoAuth } from '../common/auth';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { toBrunoAssertions } from '../common/assertions';
import { isNonEmptyString, uuid, ensureString } from '../../../utils';

const toBrunoGrpcMetadata = (metadata: GrpcMetadata[] | null | undefined): BrunoKeyValue[] | undefined => {
  if (!metadata?.length) {
    return undefined;
  }

  const brunoMetadata = metadata.map((meta: GrpcMetadata): BrunoKeyValue => {
    const brunoMeta: BrunoKeyValue = {
      uid: uuid(),
      name: ensureString(meta.name),
      value: ensureString(meta.value),
      enabled: meta.disabled !== true
    };

    return brunoMeta;
  });

  return brunoMetadata.length ? brunoMetadata : undefined;
};

const parseGrpcRequest = (ocRequest: GrpcRequest): BrunoItem => {
  const info = ocRequest.info;
  const grpc = ocRequest.grpc;
  const runtime = ocRequest.runtime;

  const brunoRequest: BrunoGrpcRequest = {
    url: ensureString(grpc?.url),
    method: ensureString(grpc?.method),
    methodType: grpc?.methodType || '',
    protoPath: grpc?.protoFilePath || null,
    headers: toBrunoGrpcMetadata(grpc?.metadata) || [],
    auth: toBrunoAuth(grpc?.auth),
    body: {
      mode: 'grpc',
      grpc: []
    },
    script: {
      req: null,
      res: null
    },
    vars: {
      req: [],
      res: []
    },
    assertions: [],
    tests: null,
    docs: null
  };

  // message
  if (isNonEmptyString(grpc?.message)) {
    brunoRequest.body.grpc = [{
      name: '',
      content: grpc?.message as string
    }];
  }

  // scripts
  const scripts = toBrunoScripts(runtime?.scripts);
  if (scripts?.script && brunoRequest.script) {
    if (scripts.script.req) {
      brunoRequest.script.req = scripts.script.req;
    }
    if (scripts.script.res) {
      brunoRequest.script.res = scripts.script.res;
    }
  }
  if (scripts?.tests) {
    brunoRequest.tests = scripts.tests;
  }

  // variables
  const variables = toBrunoVariables(runtime?.variables);
  brunoRequest.vars = variables;

  // assertions
  const assertions = toBrunoAssertions(runtime?.assertions);
  if (assertions) {
    brunoRequest.assertions = assertions;
  }

  // docs
  if (ocRequest.docs) {
    brunoRequest.docs = ocRequest.docs;
  }

  // bruno item
  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'grpc-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest,
    settings: {},
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return brunoItem;
};

export default parseGrpcRequest;
