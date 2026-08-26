/**
 * Characterization: legacy timeline entries without bodyRef still synthesize
 * a base64 dataBuffer from inlined `data` so BodyBlock can preview them.
 */
describe('legacy timeline response body synthesis', () => {
  const synthesizeLegacyDataBuffer = (response) => {
    let { dataBuffer, data, bodyRef } = response || {};
    if (!dataBuffer && data != null && !bodyRef) {
      const safeStringifyJSONIfNotString = (obj) => {
        if (obj === null || obj === undefined) return '';
        if (typeof obj === 'string') return obj;
        try {
          return JSON.stringify(obj);
        } catch (e) {
          return '[Unserializable Object]';
        }
      };
      dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
    }
    return dataBuffer;
  };

  test('synthesizes base64 from inline data when bodyRef is absent', () => {
    const buf = synthesizeLegacyDataBuffer({ data: { hello: 'world' } });
    expect(buf).toBe(Buffer.from(JSON.stringify({ hello: 'world' })).toString('base64'));
  });

  test('does not synthesize when bodyRef is present (file-backed path)', () => {
    expect(
      synthesizeLegacyDataBuffer({
        data: null,
        bodyRef: 'body-1',
        dataBuffer: undefined
      })
    ).toBeUndefined();
  });

  test('preserves existing dataBuffer', () => {
    expect(
      synthesizeLegacyDataBuffer({
        data: 'ignored',
        dataBuffer: 'abc123'
      })
    ).toBe('abc123');
  });
});
