const { formatMultipartData } = require('../../src/utils/form-data');

describe('utils: formatMultipartData', () => {
  test('should format text field', () => {
    const data = [{ name: 'description', type: 'text', value: 'dfv' }];
    const result = formatMultipartData(data, 'boundary');

    expect(result).toContain('----boundary');
    expect(result).toContain('Content-Disposition: form-data');
    expect(result).toContain('name: description');
    expect(result).toContain('value: dfv');
    expect(result).toContain('----boundary--');
  });

  test('should format file field', () => {
    const data = [{ name: 'file', type: 'file', value: ['Dumy.xml'] }];
    const result = formatMultipartData(data, 'boundary');

    expect(result).toContain('name: file');
    expect(result).toContain('value: [File: Dumy.xml]');
  });

  test('should format multiple fields', () => {
    const data = [
      { name: 'description', type: 'text', value: 'dfv' },
      { name: 'file', type: 'file', value: ['Dumy.xml'] }
    ];
    const result = formatMultipartData(data, 'boundary');

    expect(result).toContain('name: description');
    expect(result).toContain('value: dfv');
    expect(result).toContain('name: file');
    expect(result).toContain('value: [File: Dumy.xml]');
  });

  test('should return empty string for invalid input', () => {
    expect(formatMultipartData([], 'boundary')).toBe('');
    expect(formatMultipartData(null, 'boundary')).toBe('');
  });

  test('should normalize boundary', () => {
    const data = [{ name: 'field', type: 'text', value: 'value' }];
    expect(formatMultipartData(data, '--boundary')).toContain('----boundary');
    expect(formatMultipartData(data, 'boundary--')).toContain('----boundary');
  });
});
