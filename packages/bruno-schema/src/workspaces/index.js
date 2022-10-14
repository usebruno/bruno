const Yup = require('yup');
const { uidSchema } = require("../common");

const workspaceSchema = Yup.object({
  uid: uidSchema,
  name: Yup.string()
    .min(1, 'name must be atleast 1 characters')
    .max(50, 'name must be 50 characters or less')
    .required('name is required'),
  collectionUids: Yup.array().of(uidSchema)
});

module.exports = {
  workspaceSchema
};