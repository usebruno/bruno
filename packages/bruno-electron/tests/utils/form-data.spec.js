const { formatMultipartData, createFormData } = require('../../src/utils/form-data');

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

describe('utils: createFormData', () => {
  test('auto-generated boundary is consistent between getBoundary() and body', () => {
    const data = [{ name: 'field', type: 'text', value: 'hello' }];
    const form = createFormData(data, '/tmp');
    const body = form.getBuffer().toString();
    expect(body).toContain(`--${form.getBoundary()}`);
  });

  // Regression test for https://github.com/usebruno/bruno/issues/7995
  // When the user explicitly sets Content-Type: multipart/mixed; boundary=X, the body
  // must use --X as the part delimiter. Previously createFormData ignored the user-supplied
  // boundary, so the header said boundary=X but the body used a different auto-generated one.
  // The server found no --X delimiters and treated the body as empty (400 Bad Request).
  test('uses the user-supplied boundary in the body when provided', () => {
    const userBoundary = 'user-defined-boundary-123';
    const data = [{ name: 'field', type: 'text', value: 'hello' }];
    const form = createFormData(data, '/tmp', userBoundary);

    expect(form.getBoundary()).toBe(userBoundary);
    const body = form.getBuffer().toString();
    expect(body).toContain(`--${userBoundary}`);
  });

  test('body boundary never mismatches getBoundary()', () => {
    // The core invariant: whatever boundary the form reports, the body must use it.
    // This guards against the header-patch-only fix where getHeaders() was monkeypatched
    // to report the user boundary but the body still used a different auto-generated one.
    const userBoundary = 'mixed-boundary-abc';
    const data = [
      { name: 'part1', type: 'text', value: 'value1' },
      { name: 'part2', type: 'text', value: 'value2' }
    ];
    const form = createFormData(data, '/tmp', userBoundary);
    const body = form.getBuffer().toString();

    const reportedBoundary = form.getBoundary();
    expect(reportedBoundary).toBe(userBoundary);
    // Every part delimiter in the body must use the reported boundary
    expect(body).toContain(`--${reportedBoundary}`);
    expect(body.split(`--${reportedBoundary}`).length).toBeGreaterThan(2);
  });
});
