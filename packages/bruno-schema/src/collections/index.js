const Yup = require('yup');
const { uidSchema } = require('../common');

const environmentVariablesSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable(),
  value: Yup.string().nullable(),
  type: Yup.string().oneOf(['text']).required('type is required'),
  enabled: Yup.boolean().defined(),
  secret: Yup.boolean()
})
  .noUnknown(true)
  .strict();

const environmentSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().min(1).required('name is required'),
  variables: Yup.array().of(environmentVariablesSchema).required('variables are required')
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
  .oneOf(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE'])
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

const requestBodySchema = Yup.object({
  mode: Yup.string()
    .oneOf(['none', 'json', 'text', 'xml', 'formUrlEncoded', 'multipartForm', 'graphql', 'sparql', 'rawFile'])
    .required('mode is required'),
  json: Yup.string().nullable(),
  text: Yup.string().nullable(),
  xml: Yup.string().nullable(),
  sparql: Yup.string().nullable(),
  formUrlEncoded: Yup.array().of(keyValueSchema).nullable(),
  multipartForm: Yup.array().of(multipartFormSchema).nullable(),
  graphql: graphqlBodySchema.nullable(),
  rawFile: Yup.string().nullable(),
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

const authApiKeySchema = Yup.object({
  key: Yup.string().nullable(),
  value: Yup.string().nullable(),
  placement: Yup.string().oneOf(['header', 'queryparams']).nullable()
})
  .noUnknown(true)
  .strict();

const oauth2Schema = Yup.object({
  grantType: Yup.string()
    .oneOf(['client_credentials', 'password', 'authorization_code'])
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
    is: (val) => ['authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  authorizationUrl: Yup.string().when('grantType', {
    is: (val) => ['authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  accessTokenUrl: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  clientId: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  clientSecret: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  scope: Yup.string().when('grantType', {
    is: (val) => ['client_credentials', 'password', 'authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  state: Yup.string().when('grantType', {
    is: (val) => ['authorization_code'].includes(val),
    then: Yup.string().nullable(),
    otherwise: Yup.string().nullable().strip()
  }),
  pkce: Yup.boolean().when('grantType', {
    is: (val) => ['authorization_code'].includes(val),
    then: Yup.boolean().default(false),
    otherwise: Yup.boolean()
  })
})
  .noUnknown(true)
  .strict();

const authSchema = Yup.object({
  mode: Yup.string()
    .oneOf(['inherit', 'none', 'awsv4', 'basic', 'bearer', 'digest', 'oauth2', 'wsse', 'apikey'])
    .required('mode is required'),
  awsv4: authAwsV4Schema.nullable(),
  basic: authBasicSchema.nullable(),
  bearer: authBearerSchema.nullable(),
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
  assertions: Yup.array().of(keyValueSchema).nullable(),
  tests: Yup.string().nullable(),
  docs: Yup.string().nullable()
})
  .noUnknown(true)
  .strict();

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
    name: Yup.string().nullable()
  })
    .noUnknown(true)
    .strict()
    .nullable()
})
  .noUnknown(true)
  .nullable();

const itemSchema = Yup.object({
  uid: uidSchema,
  type: Yup.string().oneOf(['http-request', 'graphql-request', 'folder', 'js']).required('type is required'),
  seq: Yup.number().min(1),
  name: Yup.string().min(1, 'name must be at least 1 character').required('name is required'),
  request: requestSchema.when('type', {
    is: (type) => ['http-request', 'graphql-request'].includes(type),
    then: (schema) => schema.required('request is required when item-type is request')
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
