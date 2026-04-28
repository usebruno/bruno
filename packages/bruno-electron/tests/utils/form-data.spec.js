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
    expect(result).toContain('filename: Dumy.xml');
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

  test('should include per-part Content-Type when contentType is set on text field', () => {
    const data = [{ name: 'message', type: 'text', value: '{"k":"v"}', contentType: 'application/json; charset=utf-8' }];
    const result = formatMultipartData(data, 'boundary');

    expect(result).toContain('Content-Type: application/json; charset=utf-8');
  });

  test('should render array text values as separate parts', () => {
    const data = [{ name: 'tag', type: 'text', value: ['a', 'b'] }];
    const result = formatMultipartData(data, 'boundary');

    const matches = result.match(/name: tag/g) || [];
    expect(matches.length).toBe(2);
    expect(result).toContain('value: a');
    expect(result).toContain('value: b');
  });

  test('should render each file as a separate part with filename in disposition', () => {
    const data = [{ name: 'attach', type: 'file', value: ['a.jpg', 'b.jpg'] }];
    const result = formatMultipartData(data, 'boundary');

    expect(result).toContain('filename: a.jpg');
    expect(result).toContain('filename: b.jpg');
    const matches = result.match(/name: attach/g) || [];
    expect(matches.length).toBe(2);
  });
});
