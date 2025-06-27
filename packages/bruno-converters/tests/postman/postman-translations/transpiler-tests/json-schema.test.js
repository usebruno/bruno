import translateCode from '../../../../src/utils/jscode-shift-translator';

describe('JSON Schema Assertions Translation', () => {
  // Tests for pm.response.to.have.jsonSchema
  it('should transform pm.response.to.have.jsonSchema with object schema', () => {
    const code = `
    const schema = {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "number" }
      }
    };
    pm.response.to.have.jsonSchema(schema);
    `;
    const translatedCode = translateCode(code);
    const expectedOutput = `
    const schema = {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "number" }
      }
    };
    const tv4 = require("tv4");
    expect(tv4.validate(res.getBody(), schema), tv4.error && tv4.error.message).to.be.true;
    `;
    expect(translatedCode).toBe(expectedOutput);
  });

  it('should transform pm.response.to.have.jsonSchema with inline schema', () => {
    const code = `
    pm.response.to.have.jsonSchema({
      "type": "object",
      "required": ["id", "name"],
      "properties": {
        "id": { "type": "integer" },
        "name": { "type": "string" }
      }
    });
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const tv4 = require("tv4");');
    expect(translatedCode).toContain('expect(tv4.validate(res.getBody(), {');
    expect(translatedCode).toContain('"type": "object"');
    expect(translatedCode).toContain('"required": ["id", "name"]');
    expect(translatedCode).toContain('"properties": {');
    expect(translatedCode).toContain('"id": { "type": "integer" }');
    expect(translatedCode).toContain('"name": { "type": "string" }');
    expect(translatedCode).toContain('}), tv4.error && tv4.error.message).to.be.true;');
  });

  it('should transform pm.response.to.have.jsonSchema inside a test function', () => {
    const code = `
    pm.test("Response matches schema", function() {
      const schema = {
        "type": "object",
        "properties": {
          "status": { "type": "string" },
          "data": { "type": "array" }
        }
      };
      pm.response.to.have.jsonSchema(schema);
    });
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('test("Response matches schema", function() {');
    expect(translatedCode).toContain('const schema = {');
    expect(translatedCode).toContain('"type": "object"');
    expect(translatedCode).toContain('"properties": {');
    expect(translatedCode).toContain('"status": { "type": "string" }');
    expect(translatedCode).toContain('"data": { "type": "array" }');
    expect(translatedCode).toContain('const tv4 = require("tv4");');
    expect(translatedCode).toContain('expect(tv4.validate(res.getBody(), schema), tv4.error && tv4.error.message).to.be.true;');
  });

  it('should transform pm.response.to.have.jsonSchema with response alias', () => {
    const code = `
    const resp = pm.response;
    const schema = { "type": "object" };
    resp.to.have.jsonSchema(schema);
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const schema = { "type": "object" };');
    expect(translatedCode).toContain('const tv4 = require("tv4");');
    expect(translatedCode).toContain('expect(tv4.validate(res.getBody(), schema), tv4.error && tv4.error.message).to.be.true;');
  });
});