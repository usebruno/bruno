const os = require('os');
const path = require('path');
const { isLargeFile, isSafeFileName, resolveYamlPath } = require('../../src/utils/filesystem');
const fs = require('fs-extra');

describe('isSafeFileName', () => {
  it('accepts a bare file name', () => {
    expect(isSafeFileName('prod')).toBe(true);
    expect(isSafeFileName('Staging 2')).toBe(true);
    expect(isSafeFileName('env.local')).toBe(true);
  });

  it('rejects path traversal and separators', () => {
    expect(isSafeFileName('../secret')).toBe(false);
    expect(isSafeFileName('a/b')).toBe(false);
    expect(isSafeFileName('a\\b')).toBe(false);
    expect(isSafeFileName('/etc/passwd')).toBe(false);
    expect(isSafeFileName('..')).toBe(false);
    expect(isSafeFileName('.')).toBe(false);
  });

  it('rejects empty or non-string values', () => {
    expect(isSafeFileName('')).toBe(false);
    expect(isSafeFileName(undefined)).toBe(false);
    expect(isSafeFileName(null)).toBe(false);
    expect(isSafeFileName(42)).toBe(false);
  });
});

describe('resolveYamlPath', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-resolve-yaml-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('resolves a .yml file', () => {
    fs.writeFileSync(path.join(dir, 'workspace.yml'), '');
    expect(resolveYamlPath(dir, 'workspace')).toBe(path.join(dir, 'workspace.yml'));
  });

  it('resolves a .yaml file', () => {
    fs.writeFileSync(path.join(dir, 'workspace.yaml'), '');
    expect(resolveYamlPath(dir, 'workspace')).toBe(path.join(dir, 'workspace.yaml'));
  });

  it('prefers .yml when both extensions are present', () => {
    fs.writeFileSync(path.join(dir, 'workspace.yml'), '');
    fs.writeFileSync(path.join(dir, 'workspace.yaml'), '');
    expect(resolveYamlPath(dir, 'workspace')).toBe(path.join(dir, 'workspace.yml'));
  });

  it('returns null when neither extension exists', () => {
    expect(resolveYamlPath(dir, 'workspace')).toBe(null);
  });

  it('returns null for a missing directory', () => {
    expect(resolveYamlPath(path.join(dir, 'nope'), 'workspace')).toBe(null);
  });

  it('does not match a bare basename with no extension', () => {
    // A directory named `environments/Global` must not be mistaken for the env file.
    fs.writeFileSync(path.join(dir, 'Global'), '');
    expect(resolveYamlPath(dir, 'Global')).toBe(null);
  });
});

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
