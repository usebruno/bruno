import { buildSkippedFilesMessage, buildExportWarningsMessage } from './apiSpec';

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

  it('always matches the leftover count to the names it left out', () => {
    const message = buildSkippedFilesMessage(files(9));
    expect(message.match(/File\d+\.bru/g)).toHaveLength(5);
    expect(message).toContain('and 4 more');
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
