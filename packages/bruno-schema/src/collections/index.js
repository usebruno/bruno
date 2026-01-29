const Yup = require('yup');
const { uidSchema } = require('../common');

const environmentVariablesSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  // Allow mixed types (string, number, boolean, object) to support setting non-string values via scripts.
  value: Yup.mixed().nullable(),
  type: Yup.string().oneOf(['text']).required('type is required'),
  enabled: Yup.boolean().defined(),
  secret: Yup.boolean()
})
  .noUnknown(true)
  .strict();

const environmentSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().min(1).required('name is required'),
  variables: Yup.array().of(environmentVariablesSchema).required('variables are required'),
  color: Yup.string().nullable().optional()
})
  .noUnknown(true)
  .strict();

const environmentsSchema = Yup.array().of(environmentSchema);

const keyValueSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  description: Yup.string().nullable(),
  enabled: Yup.boolean()
})
  .noUnknown(true)
  .strict();

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
  .strict();

const varsSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  description: Yup.string().nullable(),
  enabled: Yup.boolean(),

  // todo
  // anoop(4 feb 2023) - nobody uses this, and it needs to be removed
  local: Yup.boolean()
})
  .noUnknown(true)
  .strict();

const requestUrlSchema = Yup.string().min(0).defined();
const requestMethodSchema = Yup.string()
  .min(1, 'method is required')
  .required('method is required');

const graphqlBodySchema = Yup.object({
  query: Yup.string().nullable(),
  variables: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

const multipartFormSchema = Yup.object({
  uid: uidSchema,
  type: Yup.string().oneOf(['file', 'text']).required('type is required'),
  name: Yup.string().nullable(),
  value: Yup.mixed().when('type', {
    is: 'file',
    then: Yup.array().of(Yup.string().nullable()).nullable(),
    otherwise: Yup.string().nullable()
  }),
  description: Yup.string().nullable(),
  contentType: Yup.string().nullable(),
  enabled: Yup.boolean()
})
  .noUnknown(true)
  .strict();


const fileSchema = Yup.object({ 
  uid: uidSchema,
  filePath: Yup.string().nullable(),
  contentType: Yup.string().nullable(),
  selected: Yup.boolean()
})
  .noUnknown(true)
  .strict();

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
  file: Yup.array().of(fileSchema).nullable()
})
  .noUnknown(true)
  .strict();

const authAwsV4Schema = Yup.object({
  accessKeyId: Yup.string().nullable(),
  secretAccessKey: Yup.string().nullable(),
  sessionToken: Yup.string().nullable(),
  service: Yup.string().nullable(),
  region: Yup.string().nullable(),
  profileName: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

const authBasicSchema = Yup.object({
  username: Yup.string().nullable(),
  password: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

const authWsseSchema = Yup.object({
  username: Yup.string().nullable(),
  password: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

const authBearerSchema = Yup.object({
  token: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

const authDigestSchema = Yup.object({
  username: Yup.string().nullable(),
  password: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();



  const authNTLMSchema = Yup.object({
    username: Yup.string().nullable(),
    password: Yup.string().nullable(),
    domain: Yup.string().nullable()

  })
    .noUnknown(true)
    .strict();  

const authApiKeySchema = Yup.object({
  key: Yup.string().nullable(),
  value: Yup.string().nullable(),
  placement: Yup.string().oneOf(['header', 'queryparams']).nullable()
})
  .noUnknown(true)
  .strict();

const oauth2AuthorizationAdditionalParametersSchema = Yup.object({
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  sendIn: Yup.string()
    .oneOf(['headers', 'queryparams'])
    .required('send in property is required'),
  enabled: Yup.boolean()
})
  .noUnknown(true)
  .strict();

const oauth2AdditionalParametersSchema = Yup.object({
    name: Yup.string().nullable(),
    value: Yup.string().nullable(),
    sendIn: Yup.string()
      .oneOf(['headers', 'queryparams', 'body'])
      .required('send in property is required'),
    enabled: Yup.boolean()
  })
    .noUnknown(true)
    .strict();

const oauth2Schema = Yup.object({
  grantType: Yup.string()
    .oneOf(['client_credentials', 'password', 'authorization_code', 'implicit'])
    .required('grantType is required'),
  username: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  password: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  callbackUrl: Yup.string().when('grantType', {
    is: (val) => ['authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  authorizationUrl: Yup.string().when('grantType', {
    is: (val) => ['authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  accessTokenUrl: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  clientId: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  clientSecret: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  scope: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  state: Yup.string().when('grantType', {
    is: (val) => ['authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  pkce: Yup.boolean().when('grantType', {
    is: (val) => ['authorization_code'].includes(val),
    then: Yup.boolean().default(false),
    otherwise: Yup.boolean()
  }),
  credentialsPlacement: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  credentialsId: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  tokenPlacement: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  tokenHeaderPrefix: Yup.string().when(['grantType', 'tokenPlacement'], {
    is: (grantType, tokenPlacement) => 
      ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(grantType) && tokenPlacement === 'header',
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  tokenQueryKey: Yup.string().when(['grantType', 'tokenPlacement'], {
    is: (grantType, tokenPlacement) => 
      ['client_credentials', 'password', 'authorization_code', 'implicit'].includes(grantType) && tokenPlacement === 'url',
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  refreshTokenUrl: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
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
  additionalParameters: Yup.object({
    authorization: Yup.mixed().when('grantType', {
      is: 'authorization_code',
      then: Yup.array().of(oauth2AuthorizationAdditionalParametersSchema).required(),
      otherwise: Yup.mixed().nullable().optional()
    }),
    token: Yup.array().of(oauth2AdditionalParametersSchema).optional(),
    refresh: Yup.array().of(oauth2AdditionalParametersSchema).optional()
  })
})
  .noUnknown(true)
  .strict();

const authSchema = Yup.object({
  mode: Yup.string()
    .oneOf(['inherit', 'none', 'awsv4', 'basic', 'bearer', 'digest', 'ntlm', 'oauth2', 'wsse', 'apikey'])
    .required('mode is required'),
  awsv4: authAwsV4Schema.nullable(),
  basic: authBasicSchema.nullable(),
  bearer: authBearerSchema.nullable(),
  ntlm: authNTLMSchema.nullable(),
  digest: authDigestSchema.nullable(),
  oauth2: oauth2Schema.nullable(),
  wsse: authWsseSchema.nullable(),
  apikey: authApiKeySchema.nullable()
})
  .noUnknown(true)
  .strict()
  .nullable();

const requestParamsSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  description: Yup.string().nullable(),
  type: Yup.string().oneOf(['query', 'path']).required('type is required'),
  enabled: Yup.boolean()
})
  .noUnknown(true)
  .strict();

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
    .strict()
    .nullable(),
  response: Yup.object({
    status: Yup.string().nullable(),
    statusText: Yup.string().nullable(),
    headers: Yup.array().of(keyValueSchema).nullable(),
    body: Yup.object({
      type: Yup.string().oneOf(['json', 'text', 'xml', 'html', 'binary']).nullable(),
      content: Yup.mixed().nullable()
    }).nullable()
  })
    .noUnknown(true)
    .strict()
    .nullable()
})
  .noUnknown(true)
  .strict();

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
    .strict(),
  vars: Yup.object({
    req: Yup.array().of(varsSchema).nullable(),
    res: Yup.array().of(varsSchema).nullable()
  })
    .noUnknown(true)
    .strict()
    .nullable(),
  assertions: Yup.array().of(assertionSchema).nullable(),
  tests: Yup.string().nullable(),
  docs: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

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
    .strict()
    .required('body is required'),
  script: Yup.object({
    req: Yup.string().nullable(),
    res: Yup.string().nullable()
  })
    .noUnknown(true)
    .strict(),
  vars: Yup.object({
    req: Yup.array().of(varsSchema).nullable(),
    res: Yup.array().of(varsSchema).nullable()
  })
    .noUnknown(true)
    .strict()
    .nullable(),
  assertions: Yup.array().of(assertionSchema).nullable(),
  tests: Yup.string().nullable(),
  docs: Yup.string().nullable(),
})
  .noUnknown(true)
  .strict();

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
    .strict()
    .required('body is required'),
  script: Yup.object({
    req: Yup.string().nullable(),
    res: Yup.string().nullable()
  })
    .noUnknown(true)
    .strict(),
  vars: Yup.object({
    req: Yup.array().of(varsSchema).nullable(),
    res: Yup.array().of(varsSchema).nullable()
  })
    .noUnknown(true)
    .strict()
    .nullable(),
  assertions: Yup.array().of(assertionSchema).nullable(),
  tests: Yup.string().nullable(),
  docs: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

const wsSettingsSchema = Yup.object({
  settings: Yup.object({
    timeout: Yup.number()
      .default(500),
    keepAliveInterval: Yup.number()
      .default(0)
  }).noUnknown(true)
    .strict()
    .nullable()
});

const folderRootSchema = Yup.object({
  request: Yup.object({
    headers: Yup.array().of(keyValueSchema).nullable(),
    auth: authSchema,
    script: Yup.object({
      req: Yup.string().nullable(),
      res: Yup.string().nullable()
    })
      .noUnknown(true)
      .strict()
      .nullable(),
    vars: Yup.object({
      req: Yup.array().of(varsSchema).nullable(),
      res: Yup.array().of(varsSchema).nullable()
    })
      .noUnknown(true)
      .strict()
      .nullable(),
    tests: Yup.string().nullable()
  })
    .noUnknown(true)
    .strict()
    .nullable(),
  docs: Yup.string().nullable(),
  meta: Yup.object({
    name: Yup.string().nullable(),
    seq: Yup.number().min(1).nullable()
  })
    .noUnknown(true)
    .strict()
    .nullable()
})
  .noUnknown(true)
  .nullable();

const itemSchema = Yup.object({
  uid: uidSchema,
  type: Yup.string().oneOf(['http-request', 'graphql-request', 'folder', 'js', 'grpc-request', 'ws-request']).required('type is required'),
  seq: Yup.number().min(1),
  name: Yup.string().min(1, 'name must be at least 1 character').required('name is required'),
  tags: Yup.array().of(Yup.string().matches(/^[\w-]+$/, 'tag must be alphanumeric')),
  request: Yup.mixed().when('type', {
    is: (type) => type === 'grpc-request',
    then: grpcRequestSchema.required('request is required when item-type is grpc-request'),
    otherwise: Yup.mixed().when('type', {
      is: (type) => type === 'ws-request',
      then: wsRequestSchema.required('request is required when item-type is ws-request'),
      otherwise: requestSchema.when('type', {
        is: (type) => ['http-request', 'graphql-request'].includes(type),
        then: (schema) => schema.required('request is required when item-type is request')
      })
    })
  }),
    settings: Yup.mixed()
    .when('type', {
      is: (type) => type === 'ws-request',
      then: wsSettingsSchema,
      otherwise: Yup.object({
        encodeUrl: Yup.boolean().nullable(),
        followRedirects: Yup.boolean().nullable(),
        maxRedirects: Yup.number().min(0).max(50).nullable(),
        timeout: Yup.mixed().nullable(),
      }).noUnknown(true)
    .strict()
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
    is: 'folder',
    then: folderRootSchema,
    otherwise: Yup.mixed().nullable().notRequired()
  }),
  items: Yup.lazy(() => Yup.array().of(itemSchema)),
  examples: Yup.array().of(exampleSchema).when('type', {
    is: (type) => ['http-request', 'graphql-request', 'grpc-request'].includes(type),
    then: (schema) => schema.nullable(),
    otherwise: Yup.array().strip()
  }),
  filename: Yup.string().nullable(),
  pathname: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

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
  .strict();

module.exports = {
  requestSchema,
  itemSchema,
  environmentSchema,
  environmentsSchema,
  collectionSchema
};
