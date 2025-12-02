import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { GrpcRequest, GrpcMetadata } from '@opencollection/types/requests/grpc';
import type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
import { toBrunoAuth } from '../common/auth';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { toBrunoAssertions } from '../common/assertions';
import { isNonEmptyString, uuid } from '../../../utils';

const toBrunoGrpcMetadata = (metadata: GrpcMetadata[] | null | undefined): BrunoKeyValue[] | undefined => {
  if (!metadata?.length) {
    return undefined;
  }

  const brunoMetadata = metadata.map((meta: GrpcMetadata): BrunoKeyValue => {
    const brunoMeta: BrunoKeyValue = {
      uid: uuid(),
      name: meta.name || '',
      value: meta.value || '',
      enabled: meta.disabled !== true
    };

    return brunoMeta;
  });

  return brunoMetadata.length ? brunoMetadata : undefined;
};

const parseGrpcRequest = (ocRequest: GrpcRequest): BrunoItem => {
  const brunoRequest: BrunoGrpcRequest = {
    url: ocRequest.url || '',
    method: ocRequest.method || '',
    methodType: ocRequest.methodType || '',
    protoPath: ocRequest.protoFilePath || null,
    headers: toBrunoGrpcMetadata(ocRequest.metadata) || [],
    auth: toBrunoAuth(ocRequest.auth),
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
  if (isNonEmptyString(ocRequest.message)) {
    brunoRequest.body.grpc = [{
      name: '',
      content: ocRequest.message
    }];
  }

  // scripts
  const scripts = toBrunoScripts(ocRequest.scripts);
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
  const variables = toBrunoVariables(ocRequest.variables);
  brunoRequest.vars = variables;

  // assertions
  const assertions = toBrunoAssertions(ocRequest.assertions);
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
    seq: ocRequest.seq || 1,
    name: ocRequest.name || 'Untitled Request',
    tags: ocRequest.tags || [],
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
