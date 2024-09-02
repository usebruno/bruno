const Yup = require('yup')
const { uidSchema } = require('../common');

const runRequestSchema = Yup.object({
    request: Yup.string().min(1).required('name is required'),
    recursive: Yup.boolean()
}).noUnknown().strict();

const runSchema = Yup.object({
    uid: uidSchema,
    name: Yup.string().min(1).required('name is required'),
    seq: Yup.number().min(1),
    requests: runRequestSchema,
    vars: Yup.object(),
    environment: Yup.string()
}).noUnknown().strict();

const runsSchema = Yup.array().of(runSchema);

module.exports = {
    runSchema,
    runsSchema
}