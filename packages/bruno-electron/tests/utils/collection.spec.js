const { parseBruFileMeta } = require("../../src/utils/collection");

describe('parseBruFileMeta', () => {
  test('parses valid meta block correctly', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      meta: {
        name: '0.2_mb',
        type: 'http',
        seq: 1,
      },
    });
  });

  test('returns undefined for missing meta block', () => {
    const data = `someOtherBlock {
      key: value
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeUndefined();
  });

  test('handles empty meta block gracefully', () => {
    const data = `meta {}`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({ meta: {} });
  });

  test('ignores invalid lines in meta block', () => {
    const data = `meta {
      name: 0.2_mb
      invalidLine
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      meta: {
        name: '0.2_mb',
        seq: 1,
      },
    });
  });

  test('handles unexpected input gracefully', () => {
    const data = null;

    const result = parseBruFileMeta(data);

    expect(result).toBeUndefined();
  });

  test('handles missing colon gracefully', () => {
    const data = `meta {
      name 0.2_mb
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      meta: {
        seq: 1,
      },
    });
  });

  test('parses numeric values correctly', () => {
    const data = `meta {
      numValue: 1234
      floatValue: 12.34
      strValue: some_text
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toEqual({
      meta: {
        numValue: 1234,
        floatValue: 12.34,
        strValue: 'some_text',
      },
    });
  });

  test('handles syntax error in meta block 1', () => {
    const data = `meta 
      name: 0.2_mb
      type: http
      seq: 1
    }`;

    const result = parseBruFileMeta(data);

    expect(result).toBeUndefined();
  });

  test('handles syntax error in meta block 2', () => {
    const data = `meta {
      name: 0.2_mb
      type: http
      seq: 1
    `;

    const result = parseBruFileMeta(data);

    expect(result).toBeUndefined();
  });
});
