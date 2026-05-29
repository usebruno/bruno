import { serializeBody, UNSUPPORTED_BODY_MESSAGE } from './serializeBody';

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
});
