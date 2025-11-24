import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { GrpcRequest, GrpcMetadata, GrpcMessage, GrpcMessageVariant } from '@opencollection/types/requests/grpc';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';

const stringifyGrpcRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: GrpcRequest = {
      type: 'grpc'
    };

    ocRequest.name = isNonEmptyString(item.name) ? item.name : 'Untitled Request';

    // sequence
    if (item.seq) {
      ocRequest.seq = item.seq;
    }

    const brunoRequest = item.request as BrunoGrpcRequest;
    // url and method
    ocRequest.url = isNonEmptyString(brunoRequest.url) ? brunoRequest.url : '';
    ocRequest.method = isNonEmptyString(brunoRequest.method) ? brunoRequest.method : '';

    // method type
    if (brunoRequest.methodType) {
      ocRequest.methodType = brunoRequest.methodType;
    }

    // proto file path
    if (isNonEmptyString(brunoRequest.protoPath)) {
      ocRequest.protoFilePath = brunoRequest.protoPath;
    }

    // metadata
    if (brunoRequest.headers?.length) {
      const metadata: GrpcMetadata[] = brunoRequest.headers.map((header: BrunoKeyValue) => {
        const metadataItem: GrpcMetadata = {
          name: header.name || '',
          value: header.value || ''
        };

        if (header?.description?.trim().length) {
          metadataItem.description = header.description;
        }

        if (header.enabled === false) {
          metadataItem.disabled = true;
        }

        return metadataItem;
      });

      if (metadata.length) {
        ocRequest.metadata = metadata;
      }
    }

    // message
    if (brunoRequest.body?.mode === 'grpc' && brunoRequest.body.grpc?.length) {
      const messages = brunoRequest.body.grpc;

      // todo: bruno app supports only one message for now
      // update this when bruno app supports multiple messages
      if (messages.length) {
        const message: GrpcMessage = messages[0].content || '';
        if (message.trim().length) {
          ocRequest.message = message;
        }
      }
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      ocRequest.auth = auth;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      ocRequest.scripts = scripts;
    }

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      ocRequest.variables = variables;
    }

    // assertions
    const assertions: Assertion[] | undefined = toOpenCollectionAssertions(brunoRequest.assertions);
    if (assertions) {
      ocRequest.assertions = assertions;
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    // tags
    if (item.tags?.length) {
      ocRequest.tags = item.tags;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying gRPC request:', error);
    throw error;
  }
};

export default stringifyGrpcRequest;
