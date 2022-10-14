const Yup = require('yup');
const { uidSchema } = require("../common");

const keyValueSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string().nullable().max(256, 'name must be 256 characters or less').defined(),
  value: Yup.string().nullable().max(2048, 'value must be 2048 characters or less').defined(),
  description: Yup.string().nullable().max(2048, 'description must be 2048 characters or less').defined(),
  enabled: Yup.boolean().defined()
}).noUnknown(true).strict();

const requestTypeSchema = Yup.string().oneOf(['http', 'graphql']).required('type is required');
const requestUrlSchema = Yup.string().min(0).max(2048, 'name must be 2048 characters or less').defined();
const requestMethodSchema = Yup.string().oneOf(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']).required('method is required');

const requestBodySchema = Yup.object({
  mode: Yup.string().oneOf(['none', 'json', 'text', 'xml', 'formUrlEncoded', 'multipartForm']).required('mode is required'),
  json:  Yup.string().max(10240, 'json must be 10240 characters or less'),
  text:  Yup.string().max(10240, 'text must be 10240 characters or less'),
  xml:  Yup.string().max(10240, 'xml must be 10240 characters or less'),
  formUrlEncoded:  keyValueSchema,
  multipartForm:  keyValueSchema,
}).noUnknown(true).strict();

// Right now, the request schema is very tightly coupled with http request
// As we introduce more request types in the future, we will improve the definition to support
// schema structure based on other request type
const requestSchema = Yup.object({
  type: requestTypeSchema,
  url: requestUrlSchema,
  method: requestMethodSchema,
  headers: Yup.array().of(keyValueSchema).required('headers are required'),
  params: Yup.array().of(keyValueSchema).required('params are required'),
  body: requestBodySchema
}).noUnknown(true).strict();

const itemSchema = Yup.object({
  uid: uidSchema,
  type: Yup.string().oneOf(['request', 'folder']).required('type is required'),
  name: Yup.string()
    .min(1, 'name must be atleast 1 characters')
    .max(50, 'name must be 100 characters or less')
    .required('name is required'),
  request: requestSchema.when('type', {
      is: 'request',
      then: (schema) => schema.required('request is required when item-type is request')
    }),
  items: Yup.lazy(() => Yup.array().of(itemSchema))
}).noUnknown(true).strict();

const collectionSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string()
    .min(1, 'name must be atleast 1 characters')
    .max(50, 'name must be 100 characters or less')
    .required('name is required'),
  items:  Yup.array().of(itemSchema)
}).noUnknown(true).strict();

module.exports = {
  requestSchema,
  itemSchema,
  collectionSchema
};