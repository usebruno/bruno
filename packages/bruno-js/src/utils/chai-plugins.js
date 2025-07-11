const chai = require('chai');
const chaiString = require('chai-string');
const Ajv = require('ajv');

function createChai(chaiInstance = chai) {
  chaiInstance.use(chaiString);

  // Custom assertion for checking if a variable is JSON
  chaiInstance.use(function (chai, utils) {
    chai.Assertion.addProperty('json', function () {
      const obj = this._obj;
      const isJson = (typeof obj === 'object' && obj !== null && obj.constructor === Object) || Array.isArray(obj);

      this.assert(isJson, `expected ${utils.inspect(obj)} to be JSON`, `expected ${utils.inspect(obj)} not to be JSON`);
    });
  });

  chaiInstance.use(function (chai, utils) {
    chai.Assertion.addMethod('ajvJsonSchema', function(schema, options = {}) {
      const obj = this._obj;
      const ajv = new Ajv(options);
      const validate = ajv.compile(schema);
      const isValid = validate(obj);
      
      if (!isValid) {
        const errors = validate.errors.map(err => ({
          path: err.instancePath || 'root',
          message: err.message,
          params: err.params
        }));
        
        this.assert(
          false,
          `expected ${utils.inspect(obj)} to be valid against schema:\n${JSON.stringify(schema, null, 2)}\n\nValidation errors:\n${JSON.stringify(errors, null, 2)}`,
          `expected ${utils.inspect(obj)} not to be valid against schema:\n${JSON.stringify(schema, null, 2)}`
        );
      } else {
        this.assert(
          true,
          `expected ${utils.inspect(obj)} not to be valid against schema:\n${JSON.stringify(schema, null, 2)}`,
          `expected ${utils.inspect(obj)} to be valid against schema:\n${JSON.stringify(schema, null, 2)}`
        );
      }
    });
  });

  return chaiInstance;
}

module.exports = createChai; 
