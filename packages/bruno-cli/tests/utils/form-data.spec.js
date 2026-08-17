const { createFormData } = require('../../src/utils/form-data');
const os = require('os');

const collectionPath = os.tmpdir();

describe('utils: createFormData', () => {
  test('includes per-part Content-Type for text field with contentType', () => {
    const data = [
      {
        name: 'message',
        type: 'text',
        value: '{"key":"val"}',
        contentType: 'application/json; charset=utf-8'
      }
    ];
    const form = createFormData(data, collectionPath);
    const buffer = form.getBuffer().toString();
    expect(buffer).toContain('Content-Type: application/json; charset=utf-8');
  });

  test('omits Content-Type header for text field without contentType', () => {
    const data = [{ name: 'field', type: 'text', value: 'hello' }];
    const form = createFormData(data, collectionPath);
    const buffer = form.getBuffer().toString();
    expect(buffer).toContain('name="field"');
    expect(buffer).toContain('hello');
    expect(buffer).not.toContain('Content-Type:');
  });

  test('appends multiple text values from an array as separate parts', () => {
    const data = [{ name: 'tag', type: 'text', value: ['a', 'b'] }];
    const form = createFormData(data, collectionPath);
    const buffer = form.getBuffer().toString();
    const matches = buffer.match(/name="tag"/g) || [];
    expect(matches.length).toBe(2);
  });

  test('handles single-string file value (not wrapped in array)', () => {
    const data = [{ name: 'file', type: 'file', value: 'nonexistent.txt' }];
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => createFormData(data, collectionPath)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
