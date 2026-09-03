import { getJsonSchemaHints, getJsonSchemaLintErrors } from './json-schema';

describe('JSON Schema CodeMirror helpers', () => {
  const schema = {
    type: 'object',
    required: ['cost'],
    additionalProperties: false,
    properties: {
      cost: { type: 'number', example: 20.2 },
      duration: { type: 'integer', default: 600 }
    }
  };

  it('suggests matching properties and marks required ones', () => {
    const text = '{\n  "co": 1\n}';
    const cursor = { line: 1, ch: 5 };
    const cm = {
      getValue: () => text,
      getCursor: () => cursor,
      indexFromPos: () => text.indexOf('co') + 2,
      getTokenAt: () => ({ type: 'property', string: '"co"', start: 2, end: 6 })
    };

    const hints = getJsonSchemaHints(cm, schema);

    expect(hints.list).toHaveLength(1);
    expect(hints.list[0]).toMatchObject({
      text: '"cost": 20.2',
      displayText: 'cost (required)'
    });
  });

  it('does not suggest properties that are already present in the object', () => {
    const text = '{\n  "cost": 20.2,\n  "": 0\n}';
    const cursor = { line: 2, ch: 3 };
    const cm = {
      getValue: () => text,
      getCursor: () => cursor,
      indexFromPos: () => text.lastIndexOf('""') + 1,
      getTokenAt: () => ({ type: 'property', string: '""', start: 2, end: 4 })
    };

    const hints = getJsonSchemaHints(cm, schema);

    expect(hints.list.map((hint) => hint.displayText)).toEqual(['duration']);
  });

  it('does not suggest the complete property currently under the cursor', () => {
    const text = '{\n  "cost": 20.2\n}';
    const cursor = { line: 1, ch: 7 };
    const cm = {
      getValue: () => text,
      getCursor: () => cursor,
      indexFromPos: () => text.indexOf('cost') + 4,
      getTokenAt: () => ({ type: 'property', string: '"cost"', start: 2, end: 8 })
    };

    const hints = getJsonSchemaHints(cm, schema);

    expect(hints).toBeNull();
  });

  it('returns validation errors for schema violations', () => {
    const text = '{"cost":"twenty"}';
    const cm = { posFromIndex: (index) => ({ line: 0, ch: index }) };

    const errors = getJsonSchemaLintErrors(text, schema, cm);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('OpenAPI:');
  });

  it('does not report a type error for an unresolved Bruno variable', () => {
    const text = '{"cost":{{operationCost}}}';
    const cm = { posFromIndex: (index) => ({ line: 0, ch: index }) };

    expect(getJsonSchemaLintErrors(text, schema, cm)).toEqual([]);
  });

  it('keeps unrelated validation errors when a Bruno variable is present', () => {
    const text = '{"cost":{{operationCost}}}';
    const cm = { posFromIndex: (index) => ({ line: 0, ch: index }) };
    const schemaWithAnotherRequiredProperty = {
      ...schema,
      required: ['cost', 'duration']
    };

    const errors = getJsonSchemaLintErrors(text, schemaWithAnotherRequiredProperty, cm);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('duration');
  });

  it('returns a lint error instead of throwing for an unresolved schema reference', () => {
    const cm = { posFromIndex: (index) => ({ line: 0, ch: index }) };

    expect(() => getJsonSchemaLintErrors('{}', { $ref: './schemas.yaml#/Payment' }, cm)).not.toThrow();
    expect(getJsonSchemaLintErrors('{}', { $ref: './schemas.yaml#/Payment' }, cm)).toEqual([
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('OpenAPI:')
      })
    ]);
  });
});
