const Yup = require('yup');
const { uidSchema } = require("../common");

const environmentVariablesSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable().max(256, 'name must be 256 characters or less'),
  value: Yup.string().nullable().max(2048, 'value must be 2048 characters or less'),
  type: Yup.string().oneOf(['text']).required('type is required'),
  enabled: Yup.boolean().defined()
}).noUnknown(true).strict();


const environmentSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().min(1).max(50, 'name must be 50 characters or less').required('name is required'),
  variables: Yup.array().of(environmentVariablesSchema).required('variables are required')
}).noUnknown(true).strict();

const environmentsSchema = Yup.array().of(environmentSchema);

const keyValueSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable().max(256, 'name must be 256 characters or less'),
  value: Yup.string().nullable().max(2048, 'value must be 2048 characters or less'),
  description: Yup.string().nullable().max(2048, 'description must be 2048 characters or less'),
  enabled: Yup.boolean()
}).noUnknown(true).strict();

const requestUrlSchema = Yup.string().min(0).max(2048, 'name must be 2048 characters or less').defined();
const requestMethodSchema = Yup.string().oneOf(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']).required('method is required');

const requestBodySchema = Yup.object({
  mode: Yup.string().oneOf(['none', 'json', 'text', 'xml', 'formUrlEncoded', 'multipartForm']).required('mode is required'),
  json:  Yup.string().max(10240, 'json must be 10240 characters or less').nullable(),
  text:  Yup.string().max(10240, 'text must be 10240 characters or less').nullable(),
  xml:  Yup.string().max(10240, 'xml must be 10240 characters or less').nullable(),
  formUrlEncoded:  Yup.array().of(keyValueSchema).nullable(),
  multipartForm:  Yup.array().of(keyValueSchema).nullable(),
}).noUnknown(true).strict();

// Right now, the request schema is very tightly coupled with http request
// As we introduce more request types in the future, we will improve the definition to support
// schema structure based on other request type
const requestSchema = Yup.object({
  url: requestUrlSchema,
  method: requestMethodSchema,
  headers: Yup.array().of(keyValueSchema).required('headers are required'),
  params: Yup.array().of(keyValueSchema).required('params are required'),
  body: requestBodySchema
}).noUnknown(true).strict();

const itemSchema = Yup.object({
  uid: uidSchema,
  type: Yup.string().oneOf(['http-request', 'graphql-request', 'folder']).required('type is required'),
  name: Yup.string()
    .min(1, 'name must be atleast 1 characters')
    .max(50, 'name must be 100 characters or less')
    .required('name is required'),
  request: requestSchema.when('type', {
      is: (type) => ['http-request', 'graphql-request'].includes(type),
      then: (schema) => schema.required('request is required when item-type is request')
    }),
  items: Yup.lazy(() => Yup.array().of(itemSchema)),
  filename: Yup.string().max(1024, 'filename cannot be more than 1024 characters').nullable(),
  pathname: Yup.string().max(1024, 'pathname cannot be more than 1024 characters').nullable()
}).noUnknown(true).strict();

const collectionSchema = Yup.object({
  version: Yup.string().oneOf(['1']).required('version is required'),
  uid: uidSchema,
  name: Yup.string()
    .min(1, 'name must be atleast 1 characters')
    .max(50, 'name must be 100 characters or less')
    .required('name is required'),
  items:  Yup.array().of(itemSchema),
  activeEnvironmentUid: Yup.string()
    .length(21, 'activeEnvironmentUid must be 21 characters in length')
    .matches(/^[a-zA-Z0-9]*$/, 'uid must be alphanumeric')
    .nullable(),
  environments: environmentsSchema,
  pathname: Yup.string().max(1024, 'pathname cannot be more than 1024 characters').nullable()
}).noUnknown(true).strict();


module.exports = {
  requestSchema,
  itemSchema,
  environmentsSchema,
  collectionSchema
};