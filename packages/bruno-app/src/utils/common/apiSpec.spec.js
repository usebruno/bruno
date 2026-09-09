import { buildSkippedFilesMessage, buildExportWarningsMessage, getCollectionImportError } from './apiSpec';

describe('buildSkippedFilesMessage', () => {
  const files = (count) => Array.from({ length: count }, (_, i) => `File${i + 1}.bru`);

  it('says "it was skipped" when only one file could not be read', () => {
    expect(buildSkippedFilesMessage(['Broken.bru'])).toBe('Could not parse Broken.bru; it was skipped');
  });

  it('says "they were skipped" when several files could not be read', () => {
    expect(buildSkippedFilesMessage(files(2))).toBe('Could not parse File1.bru, File2.bru; they were skipped');
  });

  it('lists all the file names when there are few enough to show', () => {
    const message = buildSkippedFilesMessage(files(5));
    expect(message).toBe(
      'Could not parse File1.bru, File2.bru, File3.bru, File4.bru, File5.bru; they were skipped'
    );
    expect(message).not.toContain('more');
  });

  it('shows the first few file names and counts how many others there were', () => {
    expect(buildSkippedFilesMessage(files(8))).toBe(
      'Could not parse File1.bru, File2.bru, File3.bru, File4.bru, File5.bru and 3 more; they were skipped'
    );
  });

  it('never floods the message with names, even when hundreds of files were skipped', () => {
    const message = buildSkippedFilesMessage(files(200));
    expect(message.match(/File\d+\.bru/g)).toHaveLength(5);
    expect(message).toContain('and 195 more');
  });

  it('lets the caller choose how many file names to show', () => {
    expect(buildSkippedFilesMessage(files(8), 2)).toBe(
      'Could not parse File1.bru, File2.bru and 6 more; they were skipped'
    );
  });

  it('shows every name when the caller allows more names than there are files', () => {
    const message = buildSkippedFilesMessage(files(8), 10);
    expect(message.match(/File\d+\.bru/g)).toHaveLength(8);
    expect(message).not.toContain('more');
  });

  it('uses the standard limit when the caller does not choose one', () => {
    expect(buildSkippedFilesMessage(files(8), undefined)).toBe(buildSkippedFilesMessage(files(8)));
    expect(buildSkippedFilesMessage(files(8))).toContain('and 3 more');
  });

  it('always matches the leftover count to the names it left out', () => {
    const message = buildSkippedFilesMessage(files(8), -1);
    expect(message.match(/File\d+\.bru/g)).toHaveLength(7);
    expect(message).toContain('and 1 more');
  });
});

describe('buildExportWarningsMessage', () => {
  it('says "warning" when only one request could not be read fully', () => {
    expect(buildExportWarningsMessage(['GetUsers.bru'])).toBe(
      'Created with 1 warning; some request bodies could not be fully parsed'
    );
  });

  it('says "warnings" when several requests could not be read fully', () => {
    expect(buildExportWarningsMessage(['GetUsers.bru', 'CreateUser.bru'])).toBe(
      'Created with 2 warnings; some request bodies could not be fully parsed'
    );
  });

  it('counts every warning, however many there are', () => {
    expect(buildExportWarningsMessage(new Array(12).fill('Broken.bru'))).toContain('Created with 12 warnings');
  });
});

describe('getCollectionImportError', () => {
  const collection = (requests) => ({ name: 'C', configFile: 'bruno.json', requests, envVariables: {}, collectionVariables: {} });

  it('stops the user creating a spec when the chosen collection could not be read', () => {
    expect(getCollectionImportError(null)).toMatch(/bruno.json or opencollection.yml/);
  });

  it('stops the user creating a spec before they have picked a collection', () => {
    expect(getCollectionImportError(undefined)).toMatch(/bruno.json or opencollection.yml/);
  });

  it('allows a real collection that has no requests in it yet', () => {
    expect(getCollectionImportError(collection([]))).toBeNull();
  });

  it('allows a real collection even when it has no list of requests at all', () => {
    expect(getCollectionImportError({ name: 'C', configFile: 'opencollection.yml' })).toBeNull();
  });

  it('allows a collection that has at least one request in it', () => {
    expect(getCollectionImportError(collection([{ name: 'GetUsers' }]))).toBeNull();
  });
});
