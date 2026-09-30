const {
  resolveResponseSaveFilename,
  resolveResponseSaveDefaultPath
} = require('./response-save-filename');

describe('resolveResponseSaveFilename', () => {
  test('prefers content-disposition filename', () => {
    expect(
      resolveResponseSaveFilename({
        headers: { 'content-disposition': 'attachment; filename="report.json"' },
        url: 'https://example.com/ignored.bin'
      })
    ).toBe('report.json');
  });

  test('falls back to url path then content-type', () => {
    expect(
      resolveResponseSaveFilename({
        headers: {},
        url: 'https://example.com/files/data.csv'
      })
    ).toBe('data.csv');

    expect(
      resolveResponseSaveFilename({
        headers: { 'content-type': 'application/json' },
        url: 'https://example.com/api'
      })
    ).toBe('response.json');
  });

  test('resolveResponseSaveDefaultPath joins pathname directory', () => {
    expect(
      resolveResponseSaveDefaultPath({
        headers: { 'content-type': 'text/plain' },
        url: 'https://example.com/x',
        pathname: '/collections/demo/req.bru'
      })
    ).toMatch(/response\.txt$/);
  });
});
