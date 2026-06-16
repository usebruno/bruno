const {
  getValueString,
  extractTypedAnnotations,
  buildAnnotationsFromVariable,
  serializeAnnotations
} = require('../src/utils');

describe('getValueString', () => {
  it('returns single line value as-is', () => {
    expect(getValueString('hello world')).toBe('hello world');
  });

  it('wraps multiline value in triple quotes with indentation', () => {
    expect(getValueString('line1\nline2\nline3')).toBe('\'\'\'\n  line1\n  line2\n  line3\n\'\'\'');
  });

  it('normalizes different newline types', () => {
    expect(getValueString('line1\r\nline2\rline3\nline4')).toBe('\'\'\'\n  line1\n  line2\n  line3\n  line4\n\'\'\'');
  });

  it('returns empty string for empty/null/undefined', () => {
    expect(getValueString('')).toBe('');
    expect(getValueString(null)).toBe('');
    expect(getValueString(undefined)).toBe('');
  });

  it('returns "0" for the number 0 (truthy guard)', () => {
    expect(getValueString(0)).toBe('0');
  });

  it('returns "false" for boolean false (truthy guard)', () => {
    expect(getValueString(false)).toBe('false');
  });

  it('stringifies numbers and booleans to their primitive form', () => {
    expect(getValueString(42)).toBe('42');
    expect(getValueString(true)).toBe('true');
  });

  it('JSON-stringifies object values and wraps multiline output in triple quotes', () => {
    const out = getValueString({ a: 1, b: 'x' });
    expect(out).toContain('"a": 1');
    expect(out).toContain('"b": "x"');
  });
});

describe('extractTypedAnnotations', () => {
  it('sets dataType and coerces value when a dataType annotation is present', () => {
    const result = { value: '42' };
    extractTypedAnnotations([{ name: 'number' }], result);
    expect(result.dataType).toBe('number');
    expect(result.value).toBe(42);
  });

  it('does nothing when no dataType annotation is present', () => {
    const result = { value: 'abc' };
    extractTypedAnnotations([{ name: 'description', value: 'doc' }], result);
    expect(result.dataType).toBeUndefined();
    expect(result.value).toBe('abc');
  });

  it('does not materialize @string as an explicit dataType', () => {
    const result = { value: 'abc' };
    extractTypedAnnotations([{ name: 'string' }], result);
    expect(result.dataType).toBeUndefined();
  });

  it('picks the last dataType annotation when multiple are stacked', () => {
    const result = { value: '99' };
    extractTypedAnnotations([{ name: 'object' }, { name: 'number' }], result);
    expect(result.dataType).toBe('number');
    expect(result.value).toBe(99);
  });

  it('preserves the declared dataType and leaves the raw value when coercion is impossible', () => {
    // The DataTypeSelector relies on this: when dataType is preserved but the
    // coerced value's type doesn't match, the UI surfaces a warning icon.
    const result = { value: 'not-a-number' };
    extractTypedAnnotations([{ name: 'number' }], result);
    expect(result.dataType).toBe('number');
    expect(result.value).toBe('not-a-number');
  });

  it('preserves @boolean even when the literal is not a boolean string', () => {
    const result = { value: 'maybe' };
    extractTypedAnnotations([{ name: 'boolean' }], result);
    expect(result.dataType).toBe('boolean');
    expect(result.value).toBe('maybe');
  });

  it('preserves @object even when the value is not parseable JSON', () => {
    const result = { value: 'plain text' };
    extractTypedAnnotations([{ name: 'object' }], result);
    expect(result.dataType).toBe('object');
    expect(result.value).toBe('plain text');
  });

  it('handles null / empty annotations safely', () => {
    const result = { value: 'abc' };
    extractTypedAnnotations(null, result);
    extractTypedAnnotations([], result);
    expect(result.dataType).toBeUndefined();
  });
});

describe('buildAnnotationsFromVariable', () => {
  it('returns an empty array when no dataType and no annotations', () => {
    expect(buildAnnotationsFromVariable({})).toEqual([]);
  });

  it('prepends a dataType annotation from the dataType field', () => {
    expect(buildAnnotationsFromVariable({ dataType: 'number' })).toEqual([{ name: 'number' }]);
  });

  it('drops any existing dataType annotation and rebuilds from the dataType field', () => {
    const out = buildAnnotationsFromVariable({
      dataType: 'number',
      annotations: [{ name: 'string' }, { name: 'description', value: 'doc' }]
    });
    expect(out).toEqual([{ name: 'number' }, { name: 'description', value: 'doc' }]);
  });

  it('does not emit a dataType annotation for the string default', () => {
    expect(buildAnnotationsFromVariable({ dataType: 'string' })).toEqual([]);
  });

  it('preserves non-dataType annotations when dataType is absent', () => {
    expect(buildAnnotationsFromVariable({
      annotations: [{ name: 'description', value: 'doc' }]
    })).toEqual([{ name: 'description', value: 'doc' }]);
  });
});

describe('serializeAnnotations', () => {
  it('returns an empty string for null/undefined/empty input', () => {
    expect(serializeAnnotations(null)).toBe('');
    expect(serializeAnnotations(undefined)).toBe('');
    expect(serializeAnnotations([])).toBe('');
  });

  it('serializes a valueless annotation as @name with a trailing newline', () => {
    expect(serializeAnnotations([{ name: 'number' }])).toBe('@number\n');
  });

  it('serializes a string-valued annotation using single-quote delimiters by default', () => {
    expect(serializeAnnotations([{ name: 'description', value: 'a doc' }])).toBe('@description(\'a doc\')\n');
  });

  it('switches to double-quote delimiters when the value contains a single quote', () => {
    expect(serializeAnnotations([{ name: 'description', value: 'O\'Reilly' }])).toBe('@description("O\'Reilly")\n');
  });

  it('keeps single-quote delimiters when the value contains a double quote', () => {
    expect(serializeAnnotations([{ name: 'description', value: 'say "hi"' }])).toBe('@description(\'say "hi"\')\n');
  });

  it('wraps multiline values in triple-quote delimiters with 2-space indentation', () => {
    expect(serializeAnnotations([{ name: 'description', value: 'line1\nline2' }])).toBe(
      '@description(\'\'\'\n  line1\n  line2\n\'\'\')\n'
    );
  });

  it('joins multiple annotations with newlines and adds a single trailing newline', () => {
    expect(
      serializeAnnotations([
        { name: 'number' },
        { name: 'description', value: 'doc' }
      ])
    ).toBe('@number\n@description(\'doc\')\n');
  });

  it('coerces non-string values to strings via String() before quoting', () => {
    expect(serializeAnnotations([{ name: 'count', value: 42 }])).toBe('@count(\'42\')\n');
    expect(serializeAnnotations([{ name: 'enabled', value: false }])).toBe('@enabled(\'false\')\n');
  });

  it('treats null/empty-string values as present (not as missing)', () => {
    // `a.value === undefined` is the only branch that renders without parentheses,
    // so null and '' both serialize as quoted empty-ish values.
    expect(serializeAnnotations([{ name: 'description', value: null }])).toBe('@description(\'null\')\n');
    expect(serializeAnnotations([{ name: 'description', value: '' }])).toBe('@description(\'\')\n');
  });
});
