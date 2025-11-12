const { isLargeFile } = require('../../src/utils/filesystem');
const fs = require('fs-extra');

describe('isLargeFile', () => {
  let existsSyncSpy;
  let lstatSyncSpy;
  let statSyncSpy;

  beforeEach(() => {
    existsSyncSpy = jest.spyOn(fs, 'existsSync');
    lstatSyncSpy = jest.spyOn(fs, 'lstatSync');
    statSyncSpy = jest.spyOn(fs, 'statSync');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false when file size is below default threshold (10MB)', () => {
    existsSyncSpy.mockReturnValue(true);
    lstatSyncSpy.mockReturnValue({ isFile: () => true });
    statSyncSpy.mockReturnValue({ size: 5 * 1024 * 1024 }); // 5MB

    expect(isLargeFile('/path/small.bin')).toBe(false);
  });

  it('should return true when file size is above default threshold (10MB)', () => {
    existsSyncSpy.mockReturnValue(true);
    lstatSyncSpy.mockReturnValue({ isFile: () => true });
    statSyncSpy.mockReturnValue({ size: 15 * 1024 * 1024 }); // 15MB

    expect(isLargeFile('/path/large.bin')).toBe(true);
  });

  it('should respect custom threshold (args true or false)', () => {
    existsSyncSpy.mockReturnValue(true);
    lstatSyncSpy.mockReturnValue({ isFile: () => true });
    statSyncSpy.mockReturnValue({ size: 50 });

    expect(isLargeFile('/path/file.bin', 100)).toBe(false); // 50 < 100
    expect(isLargeFile('/path/file.bin', 10)).toBe(true); // 50 > 10
  });

  it('should throw on invalid values (not a file)', () => {
    existsSyncSpy.mockReturnValue(false);
    lstatSyncSpy.mockReturnValue({ isFile: () => false });

    expect(() => isLargeFile('/path/not-a-file.bin')).toThrow('File /path/not-a-file.bin is not a file');
  });
});
