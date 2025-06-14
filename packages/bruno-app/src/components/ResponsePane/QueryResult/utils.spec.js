const { describe, it, expect } = require('@jest/globals');

import { formatResponse } from './utils';

describe('formatResponse', () => {
  describe('msgpack', () => {
    it('should decode msgpack data and return a formatted string', () => {
      const dataBuffer = Buffer.from([0x81, 0xa3, 0x66, 0x6f, 0x6f, 0xa3, 0x62, 0x61, 0x72]);
      const encoding = 'utf-8';
      const mode = 'msgpack';
      const result = formatResponse(null, dataBuffer.toString('base64'), encoding, mode);
      expect(result).toBe(`{
  "foo": "bar"
}`
        );
      });

    it('should show raw data when invalid msgpack', () => {
      const dataBuffer = Buffer.from([0x81, 0xa3, 0x66, 0x6f, 0x6f]);
      const encoding = 'utf-8';
      const mode = 'msgpack';
      const result = formatResponse(null, dataBuffer.toString('base64'), encoding, mode);
      expect(result).toBe('��foo');
    });
  })
});