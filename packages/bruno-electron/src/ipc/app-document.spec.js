jest.mock('electron', () => ({
  ipcMain: {},
  protocol: {},
  session: {}
}));

const AppDocuments = require('../app/app-documents');
const { registerAppDocument } = require('./app-document');

describe('registerAppDocument', () => {
  it('rejects owner keys longer than 1024 characters', () => {
    const appDocuments = new AppDocuments();

    expect(() => registerAppDocument(appDocuments, {
      ownerKey: 'a'.repeat(1025),
      html: ''
    })).toThrow('ownerKey must not exceed 1024 characters');
  });

  it('rejects documents larger than 5 MB', () => {
    const appDocuments = new AppDocuments();

    expect(() => registerAppDocument(appDocuments, {
      ownerKey: 'request:one',
      html: 'a'.repeat((5 * 1024 * 1024) + 1)
    })).toThrow('html must not exceed 5 MB');
  });
});

describe('AppDocuments resource limits', () => {
  it('preserves existing entries when the entry limit is reached', () => {
    const appDocuments = new AppDocuments({ maxEntries: 1, maxTotalBytes: 10 });
    const firstUrl = appDocuments.register('request:one', 'first');

    expect(() => appDocuments.register('request:two', 'second')).toThrow('App document entry limit exceeded');
    expect(appDocuments.register('request:one', 'first')).toBe(firstUrl);
  });

  it('applies the byte quota to replacement documents without losing the existing document', () => {
    const appDocuments = new AppDocuments({ maxEntries: 2, maxTotalBytes: 10 });
    const firstUrl = appDocuments.register('request:one', '12345');
    appDocuments.register('request:two', '12345');

    expect(() => appDocuments.register('request:one', '123456')).toThrow('App document byte limit exceeded');
    expect(appDocuments.register('request:one', '12345')).toBe(firstUrl);
  });

  it('releases quota when a document is unregistered', () => {
    const appDocuments = new AppDocuments({ maxEntries: 1, maxTotalBytes: 5 });
    appDocuments.register('request:one', '12345');

    appDocuments.unregister('request:one');

    expect(() => appDocuments.register('request:two', '12345')).not.toThrow();
  });
});
