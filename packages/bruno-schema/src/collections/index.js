const Yup = require('yup');
const { uidSchema } = require('../common');

const BRUNO_VARIABLE_DATATYPES = ['string', 'number', 'boolean', 'object'];

const annotationSchema = Yup.object({
  name: Yup.string().min(1).required('annotation name is required'),
  value: Yup.string().nullable()
}).noUnknown(true)

const environmentVariablesSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  // Allow mixed types (string, number, boolean, object) to support setting non-string values via scripts.
  value: Yup.mixed().nullable(),
  annotations: Yup.array()
    .of(
      annotationSchema
    )
    .nullable(),
  type: Yup.string().oneOf(['text']).required('type is required'),
  enabled: Yup.boolean().defined(),
  secret: Yup.boolean(),
  description: Yup.string().nullable(),
  dataType: Yup.string().oneOf(BRUNO_VARIABLE_DATATYPES).nullable()
})
  .noUnknown(true)

// External secret variables carry `name` plus a provider-specific reference key
// (path / vaultName / secretName / ...), so unknown keys are allowed through.
const externalSecretVariableSchema = Yup.object({
  name: Yup.string().nullable()
});

const externalSecretsSchema = Yup.object({
  type: Yup.string().nullable(),
  variables: Yup.array().of(externalSecretVariableSchema)
})
  .noUnknown(true)
  .strict();

const environmentSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().min(1).required('name is required'),
  variables: Yup.array().of(environmentVariablesSchema).required('variables are required'),
  externalSecrets: externalSecretsSchema.nullable().optional(),
  color: Yup.string().nullable().optional(),
  extends: Yup.mixed()
    .test(
      'is-environment-reference',
      'extends must be an environment name or a list of environment names',
      (value) =>
        value === undefined ||
        value === null ||
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((reference) => typeof reference === 'string'))
    )
    .nullable()
    .optional(),
  pathname: Yup.string().nullable()
})
  .noUnknown(true)

const environmentsSchema = Yup.array().of(environmentSchema);

const keyValueSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  description: Yup.string().nullable(),
  annotations: Yup.array()
    .of(
      annotationSchema
    )
    .nullable(),
  enabled: Yup.boolean()
})
  .noUnknown(true)

const assertionOperators = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'contains',
  'notContains',
  'length',
  'matches',
  'notMatches',
  'startsWith',
  'endsWith',
  'between',
  'isEmpty',
  'isNotEmpty',
  'isNull',
  'isUndefined',
  'isDefined',
  'isTruthy',
  'isFalsy',
  'isJson',
  'isNumber',
  'isString',
  'isBoolean',
  'isArray'
];

const assertionSchema = keyValueSchema.shape({
  operator: Yup.string()
    .oneOf(assertionOperators)
    .nullable()
    .optional()
})
  .noUnknown(true)

const varsSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  // Allow mixed types (string, number, boolean, object) to support coerced dataType values.
  value: Yup.mixed().nullable(),
  description: Yup.string().nullable(),
  // Optional annotations on variables
  annotations: Yup.array()
    .of(
      annotationSchema
    )
    .nullable(),
  enabled: Yup.boolean(),
  dataType: Yup.string().oneOf(BRUNO_VARIABLE_DATATYPES).nullable(),

  // todo
  // anoop(4 feb 2023) - nobody uses this, and it needs to be removed
  local: Yup.boolean()
})
  .noUnknown(true)

const requestUrlSchema = Yup.string().min(0).defined();
const requestMethodSchema = Yup.string()
  .min(1, 'method is required')
  .required('method is required');

const graphqlBodySchema = Yup.object({
  query: Yup.string().nullable(),
  variables: Yup.string().nullable()
})
  .noUnknown(true)

const multipartFormSchema = Yup.object({
  uid: uidSchema,
  type: Yup.string().oneOf(['file', 'text']).required('type is required'),
  name: Yup.string().nullable(),
  value: Yup.mixed().when('type', {
    is: 'file',
    then: Yup.array().of(Yup.string().nullable()).nullable(),
    otherwise: Yup.string().nullable()
  }),
  // Optional annotations on multipart entries
  annotations: Yup.array()
    .of(
      Yup.object({
        name: Yup.string().min(1).required('annotation name is required'),
        value: Yup.string().nullable()
      })
        .noUnknown(true)
    )
    .nullable(),
  description: Yup.string().nullable(),
  contentType: Yup.string().nullable(),
  enabled: Yup.boolean()
})
  .noUnknown(true)


const fileSchema = Yup.object({ 
  uid: uidSchema,
  filePath: Yup.string().nullable(),
  contentType: Yup.string().nullable(),
  selected: Yup.boolean()
})
  .noUnknown(true)

// Add annotations to file entries (when parsed from body:file blocks they can have @contentType only currently,
// but adding annotations ensures roundtrip validation doesn't fail if annotations are present in future)
const fileSchemaWithAnnotations = fileSchema.shape({
  description: Yup.string().nullable(),
  annotations: Yup.array()
    .of(
      annotationSchema
    )
    .nullable()
});

const requestBodySchema = Yup.object({
  mode: Yup.string()
    .oneOf(['none', 'json', 'text', 'xml', 'formUrlEncoded', 'multipartForm', 'graphql', 'sparql', 'file'])
    .required('mode is required'),
  json: Yup.string().nullable(),
  text: Yup.string().nullable(),
  xml: Yup.string().nullable(),
  sparql: Yup.string().nullable(),
  formUrlEncoded: Yup.array().of(keyValueSchema).nullable(),
  multipartForm: Yup.array().of(multipartFormSchema).nullable(),
  graphql: graphqlBodySchema.nullable(),
  file: Yup.array().of(fileSchemaWithAnnotations).nullable()
})
  .noUnknown(true)

const authAwsV4Schema = Yup.object({
  accessKeyId: Yup.string().nullable(),
  secretAccessKey: Yup.string().nullable(),
  sessionToken: Yup.string().nullable(),
  service: Yup.string().nullable(),
  region: Yup.string().nullable(),
  profileName: Yup.string().nullable()
})
  .noUnknown(true)

const authBasicSchema = Yup.object({
  username: Yup.string().nullable(),
  password: Yup.string().nullable()
})
  .noUnknown(true)

const authWsseSchema = Yup.object({
  username: Yup.string().nullable(),
  password: Yup.string().nullable()
})
  .noUnknown(true)

const authBearerSchema = Yup.object({
  token: Yup.string().nullable()
})
  .noUnknown(true)

const authDigestSchema = Yup.object({
  username: Yup.string().nullable(),
  password: Yup.string().nullable()
})
  .noUnknown(true)



  const authNTLMSchema = Yup.object({
    username: Yup.string().nullable(),
    password: Yup.string().nullable(),
    domain: Yup.string().nullable()

  })
    .noUnknown(true);

const authApiKeySchema = Yup.object({
  key: Yup.string().nullable(),
  value: Yup.string().nullable(),
  placement: Yup.string().oneOf(['header', 'queryparams']).nullable()
})
  .noUnknown(true)

const authEdgeGridSchema = Yup.object({
  accessToken: Yup.string().nullable(),
  clientToken: Yup.string().nullable(),
  clientSecret: Yup.string().nullable(),
  nonce: Yup.string().nullable(),
  timestamp: Yup.string().nullable(),
  baseURL: Yup.string().nullable(),
  headersToSign: Yup.string().nullable(),
  maxBodySize: Yup.number().nullable()
})
  .noUnknown(true)

const authOAuth1Schema = Yup.object({
  consumerKey: Yup.string().nullable(),
  consumerSecret: Yup.string().nullable(),
  accessToken: Yup.string().nullable(),
  accessTokenSecret: Yup.string().nullable(),
  callbackUrl: Yup.string().nullable(),
  verifier: Yup.string().nullable(),
  signatureMethod: Yup.string().oneOf(['HMAC-SHA1', 'HMAC-SHA256', 'HMAC-SHA512', 'RSA-SHA1', 'RSA-SHA256', 'RSA-SHA512', 'PLAINTEXT']).nullable(),
  privateKey: Yup.string().nullable(),
  privateKeyType: Yup.string().oneOf(['file', 'text']).nullable(),
  timestamp: Yup.string().nullable(),
  nonce: Yup.string().nullable(),
  version: Yup.string().nullable(),
  realm: Yup.string().nullable(),
  placement: Yup.string().oneOf(['header', 'query', 'body']).nullable(),
  includeBodyHash: Yup.boolean().nullable()
})
  .noUnknown(true)

const oauth2AuthorizationAdditionalParametersSchema = Yup.object({
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  sendIn: Yup.string()
    .oneOf(['headers', 'queryparams'])
    .required('send in property is required'),
  enabled: Yup.boolean()
})
  .noUnknown(true)

const oauth2AdditionalParametersSchema = Yup.object({
    name: Yup.string().nullable(),
    value: Yup.string().nullable(),
    sendIn: Yup.string()
      .oneOf(['headers', 'queryparams', 'body'])
      .required('send in property is required'),
    enabled: Yup.boolean()
  })
    .noUnknown(true)

const oauth2Schema = Yup.object({
  grantType: Yup.string()
    .oneOf(['client_credentials', 'password', 'authorization_code', 'implicit'])
    .required('grantType is required'),
  username: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  password: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  callbackUrl: Yup.string().when('grantType', {
    is: (val) => ['authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  authorizationUrl: Yup.string().when('grantType', {
    is: (val) => ['authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  accessTokenUrl: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  clientId: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  clientSecret: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  scope: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  state: Yup.string().when('grantType', {
    is: (val) => ['authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  pkce: Yup.boolean().when('grantType', {
    is: (val) => ['authorization_code'].includes(val),
    then: Yup.boolean().default(false),
    otherwise: Yup.boolean()
  }),
  credentialsPlacement: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  credentialsId: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  tokenSource: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().oneOf(['access_token', 'id_token']).optional(),
    otherwise: Yup.string().optional()
  }),
  tokenPlacement: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  tokenHeaderPrefix: Yup.string().when(['grantType', 'tokenPlacement'], {
    is: (grantType, tokenPlacement) => 
      ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(grantType) && tokenPlacement === 'header',
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  tokenQueryKey: Yup.string().when(['grantType', 'tokenPlacement'], {
    is: (grantType, tokenPlacement) => 
      ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(grantType) && tokenPlacement === 'url',
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  refreshTokenUrl: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable()
  }),
  autoRefreshToken: Yup.boolean().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.boolean().default(false),
    otherwise: Yup.boolean()
  }),
  autoFetchToken: Yup.boolean().when('grantType', {
    is: (val) => ['authorization_code', 'implicit'].includes(val),
    then: Yup.boolean().default(true),
    otherwise: Yup.boolean()
  }),
  // Nested when('grantType') crashes Yup getDefaultFromShape; keep fields optional.
  additionalParameters: Yup.object({
    authorization: Yup.array().of(oauth2AuthorizationAdditionalParametersSchema).nullable().optional(),
    token: Yup.array().of(oauth2AdditionalParametersSchema).optional(),
    refresh: Yup.array().of(oauth2AdditionalParametersSchema).optional()
  }).default(undefined)
})
  .noUnknown(true);

const authSchema = Yup.object({
  mode: Yup.string()
    .oneOf(['inherit', 'none', 'awsv4', 'basic', 'bearer', 'digest', 'ntlm', 'oauth1', 'oauth2', 'wsse', 'apikey', 'akamai-edgegrid'])
    .required('mode is required'),
  awsv4: authAwsV4Schema.nullable().default(undefined),
  basic: authBasicSchema.nullable().default(undefined),
  bearer: authBearerSchema.nullable().default(undefined),
  ntlm: authNTLMSchema.nullable().default(undefined),
  digest: authDigestSchema.nullable().default(undefined),
  oauth1: authOAuth1Schema.nullable().default(undefined),
  oauth2: oauth2Schema.nullable().default(undefined),
  wsse: authWsseSchema.nullable().default(undefined),
  apikey: authApiKeySchema.nullable().default(undefined),
  akamaiEdgegrid: authEdgeGridSchema.nullable().default(undefined)
})
  .noUnknown(true)
  .nullable()
  .default(undefined);

const requestParamsSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  description: Yup.string().nullable(),
  // Optional annotations on params
  annotations: Yup.array()
    .of(
      annotationSchema
    )
    .nullable(),
  type: Yup.string().oneOf(['query', 'path']).required('type is required'),
  enabled: Yup.boolean()
})
  .noUnknown(true)

const exampleSchema = Yup.object({
  uid: uidSchema,
  itemUid: uidSchema,
  name: Yup.string().min(1, 'name must be at least 1 character').required('name is required'),
  description: Yup.string().nullable(),
  type: Yup.string().oneOf(['http-request', 'graphql-request', 'grpc-request',]).required('type is required'),
  request: Yup.object({
    url: requestUrlSchema,
    method: requestMethodSchema,
    headers: Yup.array().of(keyValueSchema).required('headers are required'),
    params: Yup.array().of(requestParamsSchema).required('params are required'),
    body: requestBodySchema
  })
    .noUnknown(true)
    .nullable(),
  response: Yup.object({
    status: Yup.number().nullable(),
    statusText: Yup.string().nullable(),
    headers: Yup.array().of(keyValueSchema).nullable(),
    body: Yup.object({
      type: Yup.string().oneOf(['json', 'text', 'xml', 'html', 'binary']).nullable(),
      content: Yup.mixed().nullable()
    }).nullable()
  })
    .noUnknown(true)
    .nullable()
})
  .noUnknown(true)

// Right now, the request schema is very tightly coupled with http request
// As we introduce more request types in the future, we will improve the definition to support
// schema structure based on other request type
const requestSchema = Yup.object({
  url: requestUrlSchema,
  method: requestMethodSchema,
  headers: Yup.array().of(keyValueSchema).required('headers are required'),
  params: Yup.array().of(requestParamsSchema).required('params are required'),
  auth: authSchema,
  body: requestBodySchema,
  script: Yup.object({
    req: Yup.string().nullable(),
    res: Yup.string().nullable()
  })
    .noUnknown(true)
    .default(undefined),
  vars: Yup.object({
    req: Yup.array().of(varsSchema).nullable(),
    res: Yup.array().of(varsSchema).nullable()
  })
    .noUnknown(true)
    .nullable()
    .default(undefined),
  assertions: Yup.array().of(assertionSchema).nullable(),
  tests: Yup.string().nullable(),
  docs: Yup.string().nullable()
})
  .noUnknown(true)

const grpcRequestSchema = Yup.object({
  url: requestUrlSchema,
  method: Yup.string().optional(),
  methodType: Yup.string().oneOf(['unary', 'client-streaming', 'server-streaming', 'bidi-streaming', '']).nullable(),
  protoPath: Yup.string().nullable(),
  headers: Yup.array().of(keyValueSchema).required('headers are required'),
  auth: authSchema,
  body: Yup.object({
    mode: Yup.string().oneOf(['grpc']).required('mode is required'),
    grpc: Yup.array().of(Yup.object({
      name: Yup.string().nullable(),
      content: Yup.string().nullable()
    })).nullable()
  })
    .required('body is required'),
  script: Yup.object({
    beforeCallStart: Yup.string().nullable(),
    beforeMessageSend: Yup.string().nullable(),
    afterMessageReceive: Yup.string().nullable(),
    afterCallEnd: Yup.string().nullable()
  })
    .noUnknown(true),
  vars: Yup.object({
    req: Yup.array().of(varsSchema).nullable(),
    res: Yup.array().of(varsSchema).nullable()
  })
    .noUnknown(true)
    .nullable(),
  assertions: Yup.array().of(assertionSchema).nullable(),
  tests: Yup.string().nullable(),
  docs: Yup.string().nullable(),
})
  .noUnknown(true)

const wsRequestSchema = Yup.object({
  url: requestUrlSchema,
  headers: Yup.array().of(keyValueSchema).required('headers are required'),
  auth: authSchema,
  body: Yup.object({
    mode: Yup.string().oneOf(['ws']).required('mode is required'),
    ws: Yup.array()
      .of(
        Yup.object({
          name: Yup.string().nullable(),
          type: Yup.string().nullable(),
          content: Yup.string().nullable()
        })
      )
      .nullable()
  })
    .required('body is required'),
  script: Yup.object({
    req: Yup.string().nullable(),
    res: Yup.string().nullable()
  })
    .noUnknown(true),
  vars: Yup.object({
    req: Yup.array().of(varsSchema).nullable(),
    res: Yup.array().of(varsSchema).nullable()
  })
    .noUnknown(true)
    .nullable(),
  assertions: Yup.array().of(assertionSchema).nullable(),
  tests: Yup.string().nullable(),
  docs: Yup.string().nullable()
})
  .noUnknown(true)

const wsSettingsSchema = Yup.object({
    timeout: Yup.number()
      .default(500),
    keepAliveInterval: Yup.number()
      .default(0)
}).noUnknown(true);

const folderRootSchema = Yup.object({
  request: Yup.object({
    headers: Yup.array().of(keyValueSchema).nullable(),
    auth: authSchema,
    script: Yup.object({
      req: Yup.string().nullable(),
      res: Yup.string().nullable()
    })
      .noUnknown(true)
      .nullable(),
    vars: Yup.object({
      req: Yup.array().of(varsSchema).nullable(),
      res: Yup.array().of(varsSchema).nullable()
    })
      .noUnknown(true)
      .nullable(),
    tests: Yup.string().nullable()
  })
    .noUnknown(true)
    .nullable(),
  docs: Yup.string().nullable(),
  meta: Yup.object({
    name: Yup.string().nullable(),
    seq: Yup.number().min(1).nullable(),
    tags: Yup.array().of(Yup.string().min(1, 'tag must not be empty')).nullable()
  })
    .noUnknown(true)
    .nullable()
})
  .noUnknown(true)
  .nullable();

const itemSchema = Yup.object({
  uid: uidSchema,
  type: Yup.string().oneOf(['http-request', 'graphql-request', 'folder', 'js', 'app', 'grpc-request', 'ws-request']).required('type is required'),
  seq: Yup.number().min(1),
  name: Yup.string().min(1, 'name must be at least 1 character').required('name is required'),
  tags: Yup.array().of(Yup.string().min(1, 'tag must not be empty')),
  description: Yup.string().nullable(),
  request: Yup.mixed().when('type', (type) => {
    if (type === 'grpc-request') {
      return grpcRequestSchema.required('request is required when item-type is grpc-request');
    }
    if (type === 'ws-request') {
      return wsRequestSchema.required('request is required when item-type is ws-request');
    }
    if (type === 'http-request' || type === 'graphql-request') {
      return Yup.lazy((requestValue) => {
        if (requestValue == null) {
          return Yup.mixed().required('request is required when item-type is request');
        }
        return requestSchema;
      });
    }
    return Yup.mixed().nullable().notRequired();
  }),
    settings: Yup.mixed()
    .when('type', {
      is: (type) => type === 'ws-request',
      then: wsSettingsSchema,
      otherwise: Yup.object({
        encodeUrl: Yup.boolean().nullable(),
        followRedirects: Yup.boolean().nullable(),
        maxRedirects: Yup.number().integer().min(0).nullable(),
        timeout: Yup.mixed().nullable(),
        forwardAuthorizationHeader: Yup.boolean().nullable(),
        omitHeaders: Yup.array().of(Yup.string().min(1)).nullable()
      }).noUnknown(true)
    .nullable()
    }),
  fileContent: Yup.string().when('type', {
    // If the type is 'js', the fileContent field is expected to be a string.
    // This can include an empty string, indicating that the JS file may not have any content.
    is: 'js',
    then: Yup.string(),
    // For all other types, the fileContent field is not required and can be null.
    otherwise: Yup.string().nullable()
  }),
  root: Yup.mixed().when('type', {
    is: (type) => type !== 'folder',
    then: Yup.mixed().nullable().notRequired(),
    otherwise: Yup.lazy((root) => (root == null ? Yup.mixed().nullable().notRequired() : folderRootSchema))
  }),
  items: Yup.lazy(() => Yup.array().of(itemSchema)),
  examples: Yup.array().of(exampleSchema).when('type', {
    is: (type) => ['http-request', 'graphql-request', 'grpc-request'].includes(type),
    then: (schema) => schema.nullable(),
    otherwise: Yup.array().strip()
  }),
  app: Yup.object({
    code: Yup.string().nullable(),
    enabled: Yup.boolean().nullable()
  })
    .noUnknown(true)
    .nullable(),
  filename: Yup.string().nullable(),
  pathname: Yup.string().nullable()
})
  .noUnknown(true)

const collectionSchema = Yup.object({
  version: Yup.string().oneOf(['1']).required('version is required'),
  uid: uidSchema,
  name: Yup.string().min(1, 'name must be at least 1 character').required('name is required'),
  items: Yup.array().of(itemSchema),
  activeEnvironmentUid: Yup.string()
    .length(21, 'activeEnvironmentUid must be 21 characters in length')
    .matches(/^[a-zA-Z0-9]*$/, 'uid must be alphanumeric')
    .nullable(),
  environments: environmentsSchema,
  pathname: Yup.string().nullable(),
  runnerResult: Yup.object({
    items: Yup.array()
  }),
  runtimeVariables: Yup.object(),
  workspaceProcessEnvVariables: Yup.object().default({}),
  brunoConfig: Yup.object(),
  root: folderRootSchema
})
  .noUnknown(true)

module.exports = {
  requestSchema,
  itemSchema,
  environmentSchema,
  environmentsSchema,
  collectionSchema,
  annotationSchema
};