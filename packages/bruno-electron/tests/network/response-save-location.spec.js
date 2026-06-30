const path = require('path');
const {
  getResponseSaveDefaultPath,
  rememberResponseSavePath,
  resetResponseSaveDirectory
} = require('../../src/ipc/network/response-save-location');

describe('response save location', () => {
  afterEach(() => {
    resetResponseSaveDirectory();
  });

  it('defaults to the request directory before a response has been saved', () => {
    expect(getResponseSaveDefaultPath(path.join('/collection', 'folder', 'request.bru'), 'response.json')).toBe(
      path.join('/collection', 'folder', 'response.json')
    );
  });

  it('uses the previous response save directory after a successful save', () => {
    rememberResponseSavePath(path.join('/downloads', 'first.json'));

    expect(getResponseSaveDefaultPath(path.join('/collection', 'folder', 'request.bru'), 'response.json')).toBe(
      path.join('/downloads', 'response.json')
    );
  });

  it('does not update the previous response save directory when no file is chosen', () => {
    rememberResponseSavePath(path.join('/downloads', 'first.json'));
    rememberResponseSavePath(null);

    expect(getResponseSaveDefaultPath(path.join('/collection', 'folder', 'request.bru'), 'response.json')).toBe(
      path.join('/downloads', 'response.json')
    );
  });
});
