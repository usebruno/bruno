// OpenCollection types - main module
export type { OpenCollection, Extensions } from '@opencollection/types';

// OpenCollection collection/item types
export type { Item, Folder, FolderInfo } from '@opencollection/types/collection/item';

// OpenCollection HTTP request types
export type {
  HttpRequest,
  HttpRequestHeader,
  HttpResponseHeader,
  HttpRequestParam,
  HttpRequestBody,
  HttpRequestSettings,
  HttpRequestExample,
  HttpRequestExampleRequest,
  HttpRequestExampleResponse,
  HttpRequestExampleResponseBody,
  HttpRequestBodyVariant,
  HttpRequestInfo,
  HttpRequestDetails,
  HttpRequestRuntime,
  RawBody,
  FormUrlEncodedBody,
  FormUrlEncodedEntry,
  MultipartFormBody,
  MultipartFormEntry,
  FileBody,
  FileBodyVariant
} from '@opencollection/types/requests/http';

// OpenCollection GraphQL request types
export type {
  GraphQLRequest,
  GraphQLRequestSettings,
  GraphQLRequestInfo,
  GraphQLRequestDetails,
  GraphQLRequestRuntime,
  GraphQLBody,
  GraphQLBodyVariant
} from '@opencollection/types/requests/graphql';

// OpenCollection gRPC request types
export type {
  GrpcRequest,
  GrpcRequestInfo,
  GrpcRequestDetails,
  GrpcRequestRuntime,
  GrpcMetadata,
  GrpcMessage,
  GrpcMessageVariant,
  GrpcMessagePayload,
  GrpcMethodType
} from '@opencollection/types/requests/grpc';

// OpenCollection WebSocket request types
export type {
  WebSocketRequest,
  WebSocketRequestInfo,
  WebSocketRequestDetails,
  WebSocketRequestRuntime,
  WebSocketMessage,
  WebSocketMessageVariant,
  WebSocketPayload,
  WebSocketMessageType
} from '@opencollection/types/requests/websocket';

// OpenCollection config types
export type { Environment } from '@opencollection/types/config/environments';
export type { CollectionConfig } from '@opencollection/types/config/collection';
export type { Protobuf, ProtoFileItem, ProtoFileImportPath } from '@opencollection/types/config/protobuf';
export type { Proxy, ProxyConnectionConfig, ProxyConnectionAuth } from '@opencollection/types/config/proxy';
export type { ClientCertificate, PemCertificate, Pkcs12Certificate } from '@opencollection/types/config/certificates';

// OpenCollection common types
export type { RequestDefaults, RequestSettings } from '@opencollection/types/common/request-defaults';
export type { Documentation } from '@opencollection/types/common/documentation';
export type { Description } from '@opencollection/types/common/description';
export type { Info, Author } from '@opencollection/types/common/info';
export type {
  Variable,
  VariableValueVariant
} from '@opencollection/types/common/variables';
export type { Scripts } from '@opencollection/types/common/scripts';
export type { Assertion } from '@opencollection/types/common/assertions';
export type { Tag } from '@opencollection/types/common/tags';
export type {
  Action,
  ActionSetVariable,
  ActionPhase,
  ActionVariableScope,
  SetVariableActionSelector,
  SetVariableActionTarget
} from '@opencollection/types/common/actions';

// OpenCollection auth types
export type {
  Auth,
  AuthBasic,
  AuthBearer,
  AuthDigest,
  AuthNTLM,
  AuthAwsV4,
  AuthApiKey,
  AuthWsse
} from '@opencollection/types/common/auth';

export type { AuthOAuth2 } from '@opencollection/types/common/auth-oauth2';

// Bruno types - collection
export type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
export type {
  FolderRoot as BrunoFolderRoot,
  FolderRequest as BrunoFolderRequest,
  FolderMeta as BrunoFolderMeta
} from '@usebruno/schema-types/collection/folder';
export type { Collection as BrunoCollection } from '@usebruno/schema-types/collection/collection';
export type {
  Environment as BrunoEnvironment,
  EnvironmentVariable as BrunoEnvironmentVariable
} from '@usebruno/schema-types/collection/environment';
export type {
  Example as BrunoExample,
  ExampleRequest as BrunoExampleRequest,
  ExampleResponse as BrunoExampleResponse,
  ExampleResponseBody as BrunoExampleResponseBody
} from '@usebruno/schema-types/collection/examples';

// Bruno types - common
export type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
export type { Variable as BrunoVariable, Variables as BrunoVariables } from '@usebruno/schema-types/common/variables';
export type { Script as BrunoScript } from '@usebruno/schema-types/common/scripts';
export type {
  Auth as BrunoAuth,
  AuthMode as BrunoAuthMode,
  AuthAwsV4 as BrunoAuthAwsV4,
  AuthBasic as BrunoAuthBasic,
  AuthBearer as BrunoAuthBearer,
  AuthDigest as BrunoAuthDigest,
  AuthNTLM as BrunoAuthNTLM,
  AuthWsse as BrunoAuthWsse,
  AuthApiKey as BrunoAuthApiKey,
  OAuth2 as BrunoOAuth2
} from '@usebruno/schema-types/common/auth';
export type { MultipartFormEntry as BrunoMultipartFormEntry, MultipartForm as BrunoMultipartForm } from '@usebruno/schema-types/common/multipart-form';
export type { FileEntry as BrunoFileEntry, FileList as BrunoFileList } from '@usebruno/schema-types/common/file';
export type { GraphqlBody as BrunoGraphqlBody } from '@usebruno/schema-types/common/graphql';

// Bruno types - requests
export type {
  HttpRequest as BrunoHttpRequest,
  HttpRequestBody as BrunoHttpRequestBody,
  HttpRequestBodyMode as BrunoHttpRequestBodyMode,
  HttpRequestParam as BrunoHttpRequestParam,
  HttpRequestParamType as BrunoHttpRequestParamType
} from '@usebruno/schema-types/requests/http';
export type {
  GrpcRequest as BrunoGrpcRequest,
  GrpcRequestBody as BrunoGrpcRequestBody,
  GrpcMessage as BrunoGrpcMessage,
  GrpcMethodType as BrunoGrpcMethodType
} from '@usebruno/schema-types/requests/grpc';
export type {
  WebSocketRequest as BrunoWebSocketRequest,
  WebSocketRequestBody as BrunoWebSocketRequestBody,
  WebSocketMessage as BrunoWsMessage
} from '@usebruno/schema-types/requests/websocket';

export interface BrunoConfig {
  version?: string;
  name?: string;
  type?: string;
  ignore?: string[];
  protobuf?: {
    protoFiles?: { path: string }[];
    importPaths?: { path: string; disabled?: boolean }[];
  };
  proxy?: {
    disabled?: boolean;
    inherit?: boolean;
    config?: {
      protocol?: string;
      hostname?: string;
      port?: number;
      auth?: {
        disabled?: boolean;
        username?: string;
        password?: string;
      };
      bypassProxy?: string;
    };
  };
  clientCertificates?: {
    certs?: Array<{
      domain?: string;
      type?: 'pem' | 'pkcs12';
      certFilePath?: string;
      keyFilePath?: string;
      pfxFilePath?: string;
      passphrase?: string;
    }>;
  };
}

export interface BrunoCollectionRoot {
  request?: any;
  docs?: string;
  meta?: {
    name?: string;
    seq?: number;
  };
}