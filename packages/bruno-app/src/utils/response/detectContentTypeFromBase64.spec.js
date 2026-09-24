import { detectContentTypeFromBase64 } from './index';

const toBase64 = (input) => Buffer.from(input).toString('base64');

describe('detectContentTypeFromBase64', () => {
  describe('text detection', () => {
    it('detects ASCII JSON as text', () => {
      expect(detectContentTypeFromBase64(toBase64('{"a":"test"}'))).toBe('text/plain');
      expect(detectContentTypeFromBase64(toBase64('{\n  "a": "test"\n}'))).toBe('text/plain');
    });

    it('detects UTF-8 JSON with Chinese characters as text', () => {
      expect(detectContentTypeFromBase64(toBase64('{"a":"测试"}'))).toBe('text/plain');
      expect(detectContentTypeFromBase64(toBase64('{"code":0,"msg":"操作成功","data":{"name":"张三"}}'))).toBe('text/plain');
    });

    it('detects UTF-8 JSON with Cyrillic characters as text', () => {
      expect(detectContentTypeFromBase64(toBase64('{"message":"Привет, мир"}'))).toBe('text/plain');
    });

    it('detects UTF-8 text with Japanese characters and emoji as text', () => {
      expect(detectContentTypeFromBase64(toBase64('{"greeting":"こんにちは世界","mood":"😀🎉"}'))).toBe('text/plain');
    });

    it('detects a UTF-8 body longer than the 512-byte sample as text', () => {
      const body = '{"a":"' + '测'.repeat(300) + '"}';
      // 6 ASCII bytes followed by 3-byte characters, so the sample is cut inside a character
      expect(Buffer.byteLength(body)).toBeGreaterThan(512);
      expect((512 - 6) % 3).not.toBe(0);

      expect(detectContentTypeFromBase64(toBase64(body))).toBe('text/plain');
    });
  });

  describe('binary detection', () => {
    it('detects binary formats by magic number', () => {
      expect(detectContentTypeFromBase64(toBase64([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))).toBe('image/png');
      expect(detectContentTypeFromBase64(toBase64('%PDF-1.7\n'))).toBe('application/pdf');
      expect(detectContentTypeFromBase64(toBase64([0x1F, 0x8B, 0x08, 0x00, 0x00, 0x00]))).toBe('application/gzip');
    });

    it('detects SVG content', () => {
      expect(detectContentTypeFromBase64(toBase64('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('image/svg+xml');
      expect(detectContentTypeFromBase64(toBase64('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('image/svg+xml');
    });

    it('returns null for bytes that are not valid UTF-8', () => {
      const bytes = [];
      for (let i = 0; i < 100; i++) {
        bytes.push(0x80, 0x81, 0xFE, 0xFF, 0x00);
      }
      expect(detectContentTypeFromBase64(toBase64(bytes))).toBe(null);
    });

    it('returns null for UTF-8 lead bytes without continuation bytes', () => {
      const bytes = [];
      for (let i = 0; i < 256; i++) {
        bytes.push(0xE6, 0x61);
      }
      expect(detectContentTypeFromBase64(toBase64(bytes))).toBe(null);
    });

    it('returns null for mostly binary data that contains a few UTF-8 characters', () => {
      const buffer = Buffer.concat([Buffer.from('测试'), Buffer.alloc(200)]);
      expect(detectContentTypeFromBase64(buffer.toString('base64'))).toBe(null);
    });
  });

  it('returns null for empty or missing input', () => {
    expect(detectContentTypeFromBase64('')).toBe(null);
    expect(detectContentTypeFromBase64(undefined)).toBe(null);
    expect(detectContentTypeFromBase64(null)).toBe(null);
  });
});
