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
    it('throws TypeError for FormData using "Multipart form data" subject', () => {
      const fd = new FormData();
      fd.append('file', new Blob(['x']));
      expect(() => serializeBody(fd)).toThrow(TypeError);
      expect(() => serializeBody(fd)).toThrow(/Multipart form data/);
      expect(() => serializeBody(fd)).toThrow(/Create a Bruno request/);
    });

    it('throws TypeError for Blob using "Binary file upload" subject', () => {
      const blob = new Blob(['payload']);
      expect(() => serializeBody(blob)).toThrow(TypeError);
      expect(() => serializeBody(blob)).toThrow(/Binary file upload/);
    });

    it('throws TypeError for File using "File upload" subject', () => {
      const file = new File(['payload'], 'test.txt', { type: 'text/plain' });
      expect(() => serializeBody(file)).toThrow(TypeError);
      expect(() => serializeBody(file)).toThrow(/File upload/);
    });

    it('throws TypeError for ArrayBuffer using "Binary data" subject', () => {
      const buf = new ArrayBuffer(8);
      expect(() => serializeBody(buf)).toThrow(TypeError);
      expect(() => serializeBody(buf)).toThrow(/Binary data/);
    });

    it('throws TypeError for TypedArray using "Binary data" subject', () => {
      const u8 = new Uint8Array([1, 2, 3]);
      expect(() => serializeBody(u8)).toThrow(TypeError);
      expect(() => serializeBody(u8)).toThrow(/Binary data/);
    });

    it('message attributes the limitation to Bruno, not Swagger', () => {
      expect(UNSUPPORTED_BODY_MESSAGE('FormData')).toMatch(/isn't supported in Bruno yet/);
    });

    it('message lists supported alternatives', () => {
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
