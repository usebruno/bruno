const Yup = require('yup');

const uidSchema = Yup.string()
  .length(21, 'uid must be 21 characters in length')
  .matches(/^[a-zA-Z0-9]*$/, 'uid must be alphanumeric');

module.exports = {
  uidSchema
};