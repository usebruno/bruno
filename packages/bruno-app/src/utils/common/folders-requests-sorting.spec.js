const { describe, it, expect } = require('@jest/globals');
const { sortByNameThenSequence } = require('./index');

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