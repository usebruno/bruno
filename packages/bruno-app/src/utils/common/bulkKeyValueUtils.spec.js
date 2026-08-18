import {
  parseBulkKeyValue,
  parseMultipartBulkKeyValue,
  serializeBulkKeyValue,
  serializeMultipartBulkKeyValue
} from './bulkKeyValueUtils';

describe('bulkKeyValueUtils', () => {
  describe('parseBulkKeyValue', () => {
    it('parses key:value lines', () => {
      expect(parseBulkKeyValue('a:1\nb:2')).toEqual([
        { name: 'a', value: '1', enabled: true },
        { name: 'b', value: '2', enabled: true }
      ]);
    });

    it('treats // prefixed lines as disabled', () => {
      expect(parseBulkKeyValue('// a:1\nb:2')).toEqual([
        { name: 'a', value: '1', enabled: false },
        { name: 'b', value: '2', enabled: true }
      ]);
    });

    it('skips lines without a separator', () => {
      expect(parseBulkKeyValue('a:1\nno-separator')).toEqual([
        { name: 'a', value: '1', enabled: true }
      ]);
    });
  });

  describe('serializeBulkKeyValue', () => {
    it('serializes items with enabled state', () => {
      expect(
        serializeBulkKeyValue([
          { name: 'a', value: '1', enabled: true },
          { name: 'b', value: '2', enabled: false }
        ])
      ).toBe('a:1\n//b:2');
    });
  });

  describe('parseMultipartBulkKeyValue', () => {
    it('parses text params as key:value', () => {
      expect(parseMultipartBulkKeyValue('a:1\nb:2')).toEqual([
        { name: 'a', value: '1', enabled: true, type: 'text' },
        { name: 'b', value: '2', enabled: true, type: 'text' }
      ]);
    });

    it('parses file params as key@:path1,path2', () => {
      expect(parseMultipartBulkKeyValue('a@:one.png,two.pdf\nb:2')).toEqual([
        { name: 'a', value: ['one.png', 'two.pdf'], enabled: true, type: 'file' },
        { name: 'b', value: '2', enabled: true, type: 'text' }
      ]);
    });

    it('handles disabled file and text params', () => {
      expect(parseMultipartBulkKeyValue('// a@:one.png\n// b:2')).toEqual([
        { name: 'a', value: ['one.png'], enabled: false, type: 'file' },
        { name: 'b', value: '2', enabled: false, type: 'text' }
      ]);
    });

    it('skips lines without a separator', () => {
      expect(parseMultipartBulkKeyValue('a:1\nno-separator')).toEqual([
        { name: 'a', value: '1', enabled: true, type: 'text' }
      ]);
    });
  });

  describe('serializeMultipartBulkKeyValue', () => {
    it('serializes text and file params', () => {
      expect(
        serializeMultipartBulkKeyValue([
          { name: 'a', value: '1', enabled: true, type: 'text' },
          { name: 'f', value: ['one.png', 'two.pdf'], enabled: true, type: 'file' },
          { name: 'b', value: '2', enabled: false, type: 'text' }
        ])
      ).toBe('a:1\nf@:one.png,two.pdf\n//b:2');
    });

    it('handles single file path values and empty values', () => {
      expect(
        serializeMultipartBulkKeyValue([
          { name: 'f', value: 'solo.png', enabled: true, type: 'file' },
          { name: 'e', value: undefined, enabled: true, type: 'file' }
        ])
      ).toBe('f@:solo.png\ne@:');
    });
  });
});
