import { serializeBody, UNSUPPORTED_BODY_MESSAGE, UNSUPPORTED_BODY_TYPE_CODE } from './serializeBody';

// Helper: invoke serializeBody and return the thrown error (or fail).
const catchSerializeError = (body) => {
  try {
    serializeBody(body);
  } catch (err) {
    return err;
  }
  throw new Error('expected serializeBody to throw');
};

describe('serializeBody', () => {
  describe('supported body types', () => {
    it('returns undefined for null', () => {
      expect(serializeBody(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(serializeBody(undefined)).toBeUndefined();
    });

    it('returns string bodies as-is', () => {
      expect(serializeBody('{"name":"doggie"}')).toBe('{"name":"doggie"}');
      expect(serializeBody('plain text')).toBe('plain text');
    });

    it('stringifies URLSearchParams', () => {
      const params = new URLSearchParams({ a: '1', b: '2' });
      expect(serializeBody(params)).toBe('a=1&b=2');
    });
  });

  describe('unsupported body types (BRU-3300)', () => {
    it('throws TypeError for FormData with type name in message', () => {
      const fd = new FormData();
      fd.append('file', new Blob(['x']));
      expect(() => serializeBody(fd)).toThrow(TypeError);
      expect(() => serializeBody(fd)).toThrow(/FormData/);
      expect(() => serializeBody(fd)).toThrow(/Use a Bruno request/);
    });

    it('throws TypeError for Blob with type name in message', () => {
      const blob = new Blob(['payload']);
      expect(() => serializeBody(blob)).toThrow(TypeError);
      expect(() => serializeBody(blob)).toThrow(/Blob/);
    });

    it('throws TypeError for File with type name in message', () => {
      const file = new File(['payload'], 'test.txt', { type: 'text/plain' });
      expect(() => serializeBody(file)).toThrow(TypeError);
      // File is a Blob subtype; detector prefers the more specific File label.
      expect(() => serializeBody(file)).toThrow(/File/);
    });

    it('throws TypeError for ArrayBuffer', () => {
      const buf = new ArrayBuffer(8);
      expect(() => serializeBody(buf)).toThrow(TypeError);
      expect(() => serializeBody(buf)).toThrow(/ArrayBuffer/);
    });

    it('throws TypeError for TypedArray with specific constructor name', () => {
      const u8 = new Uint8Array([1, 2, 3]);
      expect(() => serializeBody(u8)).toThrow(TypeError);
      expect(() => serializeBody(u8)).toThrow(/Uint8Array/);
    });

    it('message names the supported alternatives', () => {
      expect(UNSUPPORTED_BODY_MESSAGE('FormData')).toMatch(/JSON, URL-encoded forms, plain text/);
    });
  });

  describe('error metadata preservation (Bijin review feedback)', () => {
    it('attaches err.code = UNSUPPORTED_BODY_TYPE so callers can branch programmatically', () => {
      const err = catchSerializeError(new FormData());
      expect(err.code).toBe(UNSUPPORTED_BODY_TYPE_CODE);
      expect(UNSUPPORTED_BODY_TYPE_CODE).toBe('UNSUPPORTED_BODY_TYPE');
    });

    it('attaches err.bodyType naming the specific unsupported type', () => {
      expect(catchSerializeError(new FormData()).bodyType).toBe('FormData');
      expect(catchSerializeError(new Blob(['x'])).bodyType).toBe('Blob');
      expect(catchSerializeError(new File(['x'], 'a.txt')).bodyType).toBe('File');
      expect(catchSerializeError(new ArrayBuffer(4)).bodyType).toBe('ArrayBuffer');
      expect(catchSerializeError(new Uint8Array([1, 2])).bodyType).toBe('Uint8Array');
    });

    it('thrown error is still a TypeError instance', () => {
      expect(catchSerializeError(new FormData())).toBeInstanceOf(TypeError);
    });
  });
});
