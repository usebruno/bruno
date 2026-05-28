import { formatResponse } from './index';

describe('formatResponse', () => {
  const createBase64Buffer = (content) => Buffer.from(content).toString('base64');
  const createLargeBase64Buffer = (data) => {
    // Create buffer from the actual data without modification
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return Buffer.from(content).toString('base64');
  };

  describe('invalid inputs', () => {
    it('should return empty string for invalid inputs', () => {
      const invalidCases = [
        [undefined, 'dGVzdA==', 'json'],
        [{ test: 'data' }, null, 'json'],
        [{ test: 'data' }, 'dGVzdA==', null],
        [undefined, undefined, undefined]
      ];

      invalidCases.forEach(([data, buffer, mode]) => {
        const result = formatResponse(data, buffer, mode);
        expect(result).toBe('');
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('JSON mode', () => {
    it('should format JSON data with JSONPath filter', () => {
      const data = { users: [{ name: 'John' }, { name: 'Jane' }] };
      const dataBuffer = createBase64Buffer(JSON.stringify(data));
      const result = formatResponse(data, dataBuffer, 'application/json', '$.users[0].name');

      expect(result).toBe('[\n  "John"\n]');
      expect(typeof result).toBe('string');
    });

    it('should format normal sized JSON responses', () => {
      const data = { name: 'John', age: 30 };
      const dataBuffer = createBase64Buffer(JSON.stringify(data));
      const result = formatResponse(data, dataBuffer, 'application/json');

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
      expect(typeof result).toBe('string');
    });

    it('should format normal sized JSON responses when data is already a JSON string', () => {
      const data = '{"name":"John","age":30}';
      const dataBuffer = createBase64Buffer(data); // Use data directly, not JSON.stringify(data)
      const result = formatResponse(data, dataBuffer, 'application/json');

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
      expect(typeof result).toBe('string');
    });

    it('should preserve bigint value after JSON format', () => {
      const data = '{ "data": 1736184243098437392 }';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'application/json');

      expect(result).toBe('{\n  "data": 1736184243098437392\n}');
      expect(typeof result).toBe('string');
    });

    it('should format large JSON responses without indentation', () => {
      // This test uses a custom threshold of 100 bytes to trigger large buffer behavior
      const data = {
        test: 'value',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
        content: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
      };
      const buffer = createLargeBase64Buffer(data);
      const result = formatResponse(data, buffer, 'application/json', undefined, 100);

      // Since the data exceeds the 100 byte threshold, it should return unformatted JSON
      expect(result).toBe('{"test":"value","description":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua","content":"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat"}');
      expect(typeof result).toBe('string');
    });
  });

  describe('XML mode', () => {
    it('should format normal sized XML responses', () => {
      const xmlData = '<root><item>value</item></root>';
      const dataBuffer = createBase64Buffer(xmlData);
      const result = formatResponse(xmlData, dataBuffer, 'application/xml');

      expect(typeof result).toBe('string');
      expect(result).toContain('root');
      expect(result).toContain('item');
    });

    it('should handle large XML responses', () => {
      const xmlData = '<root><item>value</item><description>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore</description><content>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo</content></root>';
      const largeBuffer = createLargeBase64Buffer(xmlData);
      const result = formatResponse(xmlData, largeBuffer, 'application/xml', undefined, 100);

      expect(typeof result).toBe('string');
      expect(result).toContain('Lorem ipsum');
    });
  });

  describe('other modes', () => {
    it('should handle string data for non-JSON/XML modes', () => {
      const data = 'plain text content';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'text/plain');

      expect(result).toBe('plain text content');
      expect(typeof result).toBe('string');
    });

    it('should handle large object data for other modes', () => {
      const data = {
        message: 'hello',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
        content: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
      };
      const largeBuffer = createLargeBase64Buffer(data);
      const result = formatResponse(data, largeBuffer, 'text/plain', undefined, 100);

      expect(typeof result).toBe('string');
      expect(result).toContain('Lorem ipsum');
    });
  });

  describe('data type handling', () => {
    it('should handle different data types and always return string', () => {
      const testCases = [
        [123, createBase64Buffer('123'), 'application/json'],
        [true, createBase64Buffer('true'), 'application/json'],
        [null, createBase64Buffer('null'), 'application/json'],
        [[], createBase64Buffer('[]'), 'application/json']
      ];

      testCases.forEach(([data, buffer, mode]) => {
        const result = formatResponse(data, buffer, mode);
        expect(typeof result).toBe('string');
      });
    });
  });
});
