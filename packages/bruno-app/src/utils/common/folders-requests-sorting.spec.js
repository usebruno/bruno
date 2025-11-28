const { describe, it, expect } = require('@jest/globals');
const { sortByNameThenSequence, sortByNameOnly, sortItemsBySortMode } = require('./index');

describe('sortByNameThenSequence', () => {
  describe('Basic functionality', () => {
    it('should return an empty array when given an empty array', () => {
      const items = [];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([]);
    });

    it('should not mutate the original array', () => {
      const items = [
        { name: 'folder_2', seq: 2 },
        { name: 'folder_1', seq: 1 }
      ];
      const originalItems = JSON.parse(JSON.stringify(items));
      sortByNameThenSequence(items);
      expect(items).toEqual(originalItems);
    });

    it('should return a new array instance', () => {
      const items = [{ name: 'folder_1' }];
      const result = sortByNameThenSequence(items);
      expect(result).not.toBe(items);
    });
  });

  describe('Alphabetical sorting (no sequence numbers)', () => {
    it('should sort items alphabetically by name when no sequence numbers are present', () => {
      const items = [
        { name: 'folder_3' },
        { name: 'folder_1' },
        { name: 'folder_2' }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1' },
        { name: 'folder_2' },
        { name: 'folder_3' }
      ]);
    });

    it('should handle case-sensitive sorting correctly', () => {
      const items = [
        { name: 'Folder_2' },
        { name: 'folder_1' },
        { name: 'FOLDER_3' }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1' },
        { name: 'Folder_2' },
        { name: 'FOLDER_3' }
      ]);
    });

    it('should handle special characters in names', () => {
      const items = [
        { name: 'folder-2' },
        { name: 'folder_1' },
        { name: 'folder 3' }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder 3' },
        { name: 'folder_1' },
        { name: 'folder-2' }
      ]);
    });
  });

  describe('Sequence-based sorting (valid sequence numbers)', () => {
    it('should sort items by sequence when all items have valid sequence numbers', () => {
      const items = [
        { name: 'folder_3', seq: 3 },
        { name: 'folder_1', seq: 1 },
        { name: 'folder_2', seq: 2 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: 1 },
        { name: 'folder_2', seq: 2 },
        { name: 'folder_3', seq: 3 }
      ]);
    });

    it('should handle duplicate sequence numbers by inserting them in alphabetical order', () => {
      const items = [
        { name: 'folder_3', seq: 1 },
        { name: 'folder_1', seq: 1 },
        { name: 'folder_2', seq: 2 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: 1 },
        { name: 'folder_3', seq: 1 },
        { name: 'folder_2', seq: 2 },
      ]);
    });

    it('should handle large sequence numbers correctly', () => {
      const items = [
        { name: 'folder_1', seq: 100 },
        { name: 'folder_2', seq: 1 },
        { name: 'folder_3', seq: 50 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_2', seq: 1 },
        { name: 'folder_3', seq: 50 },
        { name: 'folder_1', seq: 100 }
      ]);
    });
  });

  describe('Invalid sequence numbers', () => {
    it('should treat undefined sequence as invalid and sort alphabetically', () => {
      const items = [
        { name: 'folder_3', seq: undefined },
        { name: 'folder_1', seq: undefined },
        { name: 'folder_2', seq: undefined }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: undefined },
        { name: 'folder_2', seq: undefined },
        { name: 'folder_3', seq: undefined }
      ]);
    });

    it('should treat null sequence as invalid and sort alphabetically', () => {
      const items = [
        { name: 'folder_3', seq: null },
        { name: 'folder_1', seq: null },
        { name: 'folder_2', seq: null }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: null },
        { name: 'folder_2', seq: null },
        { name: 'folder_3', seq: null }
      ]);
    });

    it('should treat boolean values as invalid sequence numbers', () => {
      const items = [
        { name: 'folder_3', seq: true },
        { name: 'folder_1', seq: false },
        { name: 'folder_2', seq: true }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: false },
        { name: 'folder_2', seq: true },
        { name: 'folder_3', seq: true }
      ]);
    });

    it('should treat string values as invalid sequence numbers', () => {
      const items = [
        { name: 'folder_3', seq: '3' },
        { name: 'folder_1', seq: '1' },
        { name: 'folder_2', seq: 'invalid' }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: '1' },
        { name: 'folder_2', seq: 'invalid' },
        { name: 'folder_3', seq: '3' }
      ]);
    });

    it('should treat non-integer numbers as invalid sequence numbers', () => {
      const items = [
        { name: 'folder_3', seq: 3.5 },
        { name: 'folder_1', seq: 1.2 },
        { name: 'folder_2', seq: 2.0 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: 1.2 },
        { name: 'folder_2', seq: 2.0 },
        { name: 'folder_3', seq: 3.5 }
      ]);
    });

    it('should treat zero and negative numbers as invalid sequence numbers', () => {
      const items = [
        { name: 'folder_3', seq: 0 },
        { name: 'folder_1', seq: -1 },
        { name: 'folder_2', seq: -5 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: -1 },
        { name: 'folder_2', seq: -5 },
        { name: 'folder_3', seq: 0 }
      ]);
    });

    it('should treat NaN and Infinity as invalid sequence numbers', () => {
      const items = [
        { name: 'folder_3', seq: NaN },
        { name: 'folder_1', seq: Infinity },
        { name: 'folder_2', seq: -Infinity }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: Infinity },
        { name: 'folder_2', seq: -Infinity },
        { name: 'folder_3', seq: NaN }
      ]);
    });

    it('should handle invalid sequence numbers correctly', () => {
      const items = [
        { name: 'folder_4', seq: undefined },
        { name: 'folder_1', seq: false },
        { name: 'folder_5', seq: 'invalid' },
        { name: 'folder_2', seq: true },
        { name: 'folder_3', seq: null }
      ];
      const sorted = sortByNameThenSequence(items);
      expect(sorted).toEqual([
        { name: 'folder_1', seq: false },
        { name: 'folder_2', seq: true },
        { name: 'folder_3', seq: null },
        { name: 'folder_4', seq: undefined },
        { name: 'folder_5', seq: 'invalid' }
      ]);
    });
  });

  describe('Mixed valid and invalid sequence numbers', () => {
    it('should handle mixed valid and invalid sequence numbers correctly', () => {
      const items = [
        { name: 'folder_4', seq: undefined },
        { name: 'folder_1', seq: false },
        { name: 'folder_5', seq: 3 },
        { name: 'folder_2', seq: 2 },
        { name: 'folder_3', seq: null },
        { name: 'folder_6', seq: 9 },
        { name: 'folder_8', seq: 'invalid' },
        { name: 'folder_7', seq: 4 }
      ];
      const sorted = sortByNameThenSequence(items);
      expect(sorted).toEqual([
        { name: 'folder_1', seq: false },
        { name: 'folder_2', seq: 2 },
        { name: 'folder_5', seq: 3 },
        { name: 'folder_7', seq: 4 },
        { name: 'folder_3', seq: null },
        { name: 'folder_4', seq: undefined },
        { name: 'folder_8', seq: 'invalid' },
        { name: 'folder_6', seq: 9 }
      ]);
    });

    it('should insert sequenced items at their positions among non-sequenced items', () => {
      const items = [
        { name: 'folder_6' },
        { name: 'folder_1', seq: 1 },
        { name: 'folder_5' },
        { name: 'folder_2', seq: 2 },
        { name: 'folder_4' },
        { name: 'folder_3', seq: 4 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: 1 },
        { name: 'folder_2', seq: 2 },
        { name: 'folder_4' },
        { name: 'folder_3', seq: 4 },
        { name: 'folder_5' },
        { name: 'folder_6' }
      ]);
    });

    it('should handle sequence numbers beyond the array length', () => {
      const items = [
        { name: 'folder_1', seq: 10 },
        { name: 'folder_2' },
        { name: 'folder_3', seq: 20 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_2' },
        { name: 'folder_1', seq: 10 },
        { name: 'folder_3', seq: 20 }
      ]);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle items with missing name property without throwing errors', () => {
      const items = [
        { seq: 1 },
        { name: 'folder_1' },
        { name: 'folder_2', seq: 2 }
      ];
      // Note: This might cause issues in production, but we test the current behavior
      expect(() => sortByNameThenSequence(items)).not.toThrow();
    });

    it('should handle items with no seq property (equivalent to undefined)', () => {
      const items = [
        { name: 'folder_3' },
        { name: 'folder_1', seq: 1 },
        { name: 'folder_2' }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_1', seq: 1 },
        { name: 'folder_2' },
        { name: 'folder_3' }
      ]);
    });

    it('should handle single item arrays', () => {
      const items = [{ name: 'folder_1', seq: 1 }];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([{ name: 'folder_1', seq: 1 }]);
    });

    it('should handle items with identical names but different sequences', () => {
      const items = [
        { name: 'folder', seq: 2 },
        { name: 'folder', seq: 1 },
        { name: 'folder' }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder', seq: 1 },
        { name: 'folder', seq: 2 },
        { name: 'folder' }
      ]);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle a comprehensive mix of all scenarios', () => {
      const items = [
        { name: 'folder_10', seq: 'invalid' },
        { name: 'folder_1', seq: false },
        { name: 'folder_11', seq: 3 },
        { name: 'folder_2', seq: 2 },
        { name: 'folder_3', seq: null },
        { name: 'folder_12', seq: 9 },
        { name: 'folder_4', seq: undefined },
        { name: 'folder_5' },
        { name: 'folder_6', seq: 0 },
        { name: 'folder_7', seq: 4 },
        { name: 'folder_8', seq: 1 },
        { name: 'folder_9', seq: -1 }
      ];
      const result = sortByNameThenSequence(items);
      expect(result).toEqual([
        { name: 'folder_8', seq: 1 },
        { name: 'folder_2', seq: 2 },
        { name: 'folder_11', seq: 3 },
        { name: 'folder_7', seq: 4 },
        { name: 'folder_1', seq: false },
        { name: 'folder_10', seq: 'invalid' },
        { name: 'folder_3', seq: null },
        { name: 'folder_4', seq: undefined },
        { name: 'folder_12', seq: 9 },
        { name: 'folder_5' },
        { name: 'folder_6', seq: 0 },
        { name: 'folder_9', seq: -1 }
      ]);
    });
  });
});

describe('sortByNameOnly', () => {
  describe('Basic functionality', () => {
    it('should return an empty array when given an empty array', () => {
      const items = [];
      const result = sortByNameOnly(items);
      expect(result).toEqual([]);
    });

    it('should not mutate the original array', () => {
      const items = [
        { name: 'Zebra' },
        { name: 'Apple' }
      ];
      const originalItems = JSON.parse(JSON.stringify(items));
      sortByNameOnly(items);
      expect(items).toEqual(originalItems);
    });
  });

  describe('Alphabetical sorting', () => {
    it('should sort folders alphabetically ignoring seq property', () => {
      const folders = [
        { name: 'Zebra', seq: 1 },
        { name: 'Apple', seq: 2 },
        { name: 'Banana', seq: 3 }
      ];
      const result = sortByNameOnly(folders);
      expect(result.map((f) => f.name)).toEqual(['Apple', 'Banana', 'Zebra']);
    });

    it('should handle case-insensitive sorting', () => {
      const folders = [
        { name: 'zebra' },
        { name: 'Apple' },
        { name: 'BANANA' }
      ];
      const result = sortByNameOnly(folders);
      expect(result.map((f) => f.name)).toEqual(['Apple', 'BANANA', 'zebra']);
    });

    it('should handle numeric names naturally', () => {
      const folders = [
        { name: 'Item 10' },
        { name: 'Item 2' },
        { name: 'Item 1' },
        { name: 'Item 20' }
      ];
      const result = sortByNameOnly(folders);
      expect(result.map((f) => f.name)).toEqual(['Item 1', 'Item 2', 'Item 10', 'Item 20']);
    });

    it('should handle mixed alphanumeric names', () => {
      const folders = [
        { name: 'folder_10' },
        { name: 'folder_2' },
        { name: 'folder_1' }
      ];
      const result = sortByNameOnly(folders);
      expect(result.map((f) => f.name)).toEqual(['folder_1', 'folder_2', 'folder_10']);
    });

    it('should handle special characters', () => {
      const folders = [
        { name: '_config' },
        { name: 'api' },
        { name: '.hidden' },
        { name: 'utils' }
      ];
      const result = sortByNameOnly(folders);
      // localeCompare treats underscore before dot in most locales
      expect(result.map((f) => f.name)).toEqual(['_config', '.hidden', 'api', 'utils']);
    });

    it('should handle empty or missing names gracefully', () => {
      const folders = [
        { name: 'Valid' },
        { name: '' },
        { name: null },
        { name: undefined }
      ];
      const result = sortByNameOnly(folders);
      expect(result[0].name).toBe('Valid');
      expect(result.length).toBe(4);
    });
  });
});

describe('sortItemsBySortMode', () => {
  describe('Alphabetical mode for folders', () => {
    it('should use alphabetical sort when mode is alphabetical', () => {
      const folders = [
        { name: 'C', seq: 1 },
        { name: 'A', seq: 2 },
        { name: 'B', seq: 3 }
      ];
      const result = sortItemsBySortMode(folders, 'alphabetical', true);
      expect(result.map((f) => f.name)).toEqual(['A', 'B', 'C']);
    });

    it('should ignore seq property in alphabetical mode', () => {
      const folders = [
        { name: 'Zebra', seq: 1 },
        { name: 'Apple', seq: 99 }
      ];
      const result = sortItemsBySortMode(folders, 'alphabetical', true);
      expect(result.map((f) => f.name)).toEqual(['Apple', 'Zebra']);
    });
  });

  describe('Manual mode for folders', () => {
    it('should respect seq when mode is manual', () => {
      const folders = [
        { name: 'C', seq: 2 },
        { name: 'A', seq: 1 },
        { name: 'B', seq: 3 }
      ];
      const result = sortItemsBySortMode(folders, 'manual', true);
      expect(result.map((f) => f.name)).toEqual(['A', 'C', 'B']);
    });

    it('should use sortByNameThenSequence for manual mode', () => {
      const folders = [
        { name: 'D', seq: 2 },
        { name: 'C' },
        { name: 'B' },
        { name: 'A', seq: 1 }
      ];
      const result = sortItemsBySortMode(folders, 'manual', true);
      // Should sort alphabetically first, then apply seq
      expect(result[0].name).toBe('A'); // seq: 1
      expect(result[1].name).toBe('D'); // seq: 2
    });
  });

  describe('Default behavior', () => {
    it('should default to manual mode when sortMode is not specified', () => {
      const folders = [
        { name: 'C', seq: 2 },
        { name: 'A', seq: 1 }
      ];
      const result = sortItemsBySortMode(folders, undefined, true);
      expect(result.map((f) => f.name)).toEqual(['A', 'C']);
    });

    it('should default to manual mode when sortMode is null', () => {
      const folders = [
        { name: 'B', seq: 2 },
        { name: 'A', seq: 1 }
      ];
      const result = sortItemsBySortMode(folders, null, true);
      expect(result.map((f) => f.name)).toEqual(['A', 'B']);
    });
  });

  describe('Requests (isFolder = false)', () => {
    it('should always sort by seq for requests regardless of sortMode', () => {
      const requests = [
        { name: 'Z Request', seq: 1 },
        { name: 'A Request', seq: 2 }
      ];
      const result = sortItemsBySortMode(requests, 'alphabetical', false);
      expect(result.map((r) => r.name)).toEqual(['Z Request', 'A Request']);
      expect(result[0].seq).toBe(1);
      expect(result[1].seq).toBe(2);
    });

    it('should sort requests by seq in manual mode', () => {
      const requests = [
        { name: 'Request B', seq: 2 },
        { name: 'Request A', seq: 1 }
      ];
      const result = sortItemsBySortMode(requests, 'manual', false);
      expect(result[0].seq).toBe(1);
      expect(result[1].seq).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty array', () => {
      const result = sortItemsBySortMode([], 'alphabetical', true);
      expect(result).toEqual([]);
    });

    it('should handle single item', () => {
      const folders = [{ name: 'Only' }];
      const result = sortItemsBySortMode(folders, 'alphabetical', true);
      expect(result).toEqual([{ name: 'Only' }]);
    });

    it('should handle items without names', () => {
      const folders = [
        { name: null },
        { name: 'Valid' }
      ];
      const result = sortItemsBySortMode(folders, 'alphabetical', true);
      expect(result.length).toBe(2);
    });
  });
});