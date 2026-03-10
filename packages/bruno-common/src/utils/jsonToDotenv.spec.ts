import { jsonToDotenv } from './jsonToDotenv';
import * as dotenv from 'dotenv';

// Helper to parse .env content using dotenv package
const dotenvToJson = (content: string): Record<string, string> => {
  return dotenv.parse(Buffer.from(content));
};

describe('jsonToDotenv', () => {
  describe('basic serialization', () => {
    test('it should serialize simple variables', () => {
      const variables = [
        { name: 'FOO', value: 'bar' },
        { name: 'BAZ', value: 'qux' }
      ];
      const output = jsonToDotenv(variables);
      expect(output).toBe('FOO=bar\nBAZ=qux');
    });

    test('it should filter out variables with empty names', () => {
      const variables = [
        { name: 'VALID', value: 'value' },
        { name: '', value: 'ignored' },
        { name: '   ', value: 'also ignored' }
      ];
      const output = jsonToDotenv(variables);
      expect(output).toBe('VALID=value');
    });

    test('it should handle empty values', () => {
      const variables = [
        { name: 'EMPTY', value: '' },
        { name: 'UNDEFINED', value: undefined }
      ];
      const output = jsonToDotenv(variables);
      expect(output).toBe('EMPTY=\nUNDEFINED=');
    });

    test('it should return empty string for empty array', () => {
      expect(jsonToDotenv([])).toBe('');
    });

    test('it should return empty string for non-array input', () => {
      expect(jsonToDotenv(null as any)).toBe('');
      expect(jsonToDotenv(undefined as any)).toBe('');
      expect(jsonToDotenv({} as any)).toBe('');
    });
  });

  describe('special character handling', () => {
    test('it should quote values containing hash (#)', () => {
      const variables = [
        { name: 'PASSWORD', value: 'ABC#DEF' },
        { name: 'SECRET', value: 'key#123' }
      ];
      const output = jsonToDotenv(variables);
      expect(output).toBe('PASSWORD="ABC#DEF"\nSECRET="key#123"');
    });

    test('it should quote values containing newlines and escape them', () => {
      const variables = [{ name: 'MULTILINE', value: 'line1\nline2' }];
      const output = jsonToDotenv(variables);
      expect(output).toBe('MULTILINE="line1\\nline2"');
    });

    test('it should quote and escape values containing double quotes', () => {
      const variables = [{ name: 'QUOTED', value: 'say "hello"' }];
      const output = jsonToDotenv(variables);
      expect(output).toBe('QUOTED="say \\"hello\\""');
    });

    test('it should quote values containing single quotes', () => {
      const variables = [{ name: 'APOSTROPHE', value: 'it\'s fine' }];
      const output = jsonToDotenv(variables);
      expect(output).toBe('APOSTROPHE="it\'s fine"');
    });

    test('it should quote and escape values containing backslashes', () => {
      const variables = [{ name: 'PATH', value: 'C:\\Users\\name' }];
      const output = jsonToDotenv(variables);
      expect(output).toBe('PATH="C:\\\\Users\\\\name"');
    });

    test('it should quote and escape values containing carriage returns', () => {
      const variables = [{ name: 'CR_VALUE', value: 'line1\rline2' }];
      const output = jsonToDotenv(variables);
      expect(output).toBe('CR_VALUE="line1\\rline2"');
    });

    test('it should quote and escape values containing CRLF (Windows line endings)', () => {
      const variables = [{ name: 'CRLF_VALUE', value: 'line1\r\nline2' }];
      const output = jsonToDotenv(variables);
      expect(output).toBe('CRLF_VALUE="line1\\r\\nline2"');
    });
  });

  describe('round-trip with dotenvToJson', () => {
    test('it should preserve simple values through round-trip', () => {
      const variables = [
        { name: 'FOO', value: 'bar' },
        { name: 'BAZ', value: 'qux123' }
      ];
      const serialized = jsonToDotenv(variables);
      const parsed = dotenvToJson(serialized);
      expect(parsed.FOO).toBe('bar');
      expect(parsed.BAZ).toBe('qux123');
    });

    test('it should preserve values with hash (#) through round-trip', () => {
      const variables = [
        { name: 'PASSWORD', value: 'ABC#DEF' },
        { name: 'API_KEY', value: 'key#123#456' },
        { name: 'HASH_START', value: '#startsWithHash' },
        { name: 'HASH_SPACE', value: 'value # comment-like' }
      ];
      const serialized = jsonToDotenv(variables);
      const parsed = dotenvToJson(serialized);
      expect(parsed.PASSWORD).toBe('ABC#DEF');
      expect(parsed.API_KEY).toBe('key#123#456');
      expect(parsed.HASH_START).toBe('#startsWithHash');
      expect(parsed.HASH_SPACE).toBe('value # comment-like');
    });

    test('it should preserve values with single quotes through round-trip', () => {
      const variables = [{ name: 'APOSTROPHE', value: 'it\'s working' }];
      const serialized = jsonToDotenv(variables);
      const parsed = dotenvToJson(serialized);
      expect(parsed.APOSTROPHE).toBe('it\'s working');
    });

    test('it should preserve empty values through round-trip', () => {
      const variables = [{ name: 'EMPTY', value: '' }];
      const serialized = jsonToDotenv(variables);
      const parsed = dotenvToJson(serialized);
      expect(parsed.EMPTY).toBe('');
    });

    test('it should handle complex real-world passwords', () => {
      const variables = [
        { name: 'DB_PASSWORD', value: 'P@ss#w0rd!123' },
        { name: 'API_SECRET', value: 'abc#def$ghi%jkl' },
        { name: 'JWT_SECRET', value: 'secret-key#with-special_chars' }
      ];
      const serialized = jsonToDotenv(variables);
      const parsed = dotenvToJson(serialized);
      expect(parsed.DB_PASSWORD).toBe('P@ss#w0rd!123');
      expect(parsed.API_SECRET).toBe('abc#def$ghi%jkl');
      expect(parsed.JWT_SECRET).toBe('secret-key#with-special_chars');
    });
  });
});
