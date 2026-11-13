const path = require('path');
const { createFormData } = require('../../src/utils/form-data');

describe('createFormData', () => {
  const collectionPath = path.join(__dirname, '..', '..');
  const fixture = 'package.json';

  // form-data keeps part headers as strings in _streams; file contents are streams
  const bodyOf = (form) => form._streams.filter((s) => typeof s === 'string').join('');

  it('accepts a file entry whose value is an array of paths', () => {
    const form = createFormData([{ name: 'upload', type: 'file', value: [fixture] }], collectionPath, 'testboundary');
    expect(bodyOf(form)).toContain('name="upload"; filename="package.json"');
  });

  it('accepts a file entry whose value is a single path string', () => {
    const form = createFormData([{ name: 'upload', type: 'file', value: fixture }], collectionPath, 'testboundary');
    expect(bodyOf(form)).toContain('name="upload"; filename="package.json"');
  });

  it('ignores a file entry without a value', () => {
    const form = createFormData([{ name: 'upload', type: 'file' }], collectionPath, 'testboundary');
    expect(bodyOf(form)).not.toContain('name="upload"');
  });
});
