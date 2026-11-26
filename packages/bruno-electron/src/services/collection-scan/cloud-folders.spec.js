const fsPromises = require('node:fs/promises');

jest.mock('../collection-search/run-command', () => ({
  ...jest.requireActual('../collection-search/run-command'),
  runCommand: jest.fn()
}));

const { runCommand } = require('../collection-search/run-command');
const { findCloudFolders, isDatalessFile, findCloudOnlyFiles } = require('./cloud-folders');

const POWERSHELL_PATTERN = /^[A-Za-z]:\\[^\\]+\\System32\\WindowsPowerShell\\v1\.0\\powershell\.exe$/;

const encode = (lines) => Buffer.from(lines.join('\n'), 'utf8').toString('base64');

const decodeCheckedFiles = ([, , , env]) => Buffer.from(env.BRUNO_CLOUD_CHECK_FILES, 'base64').toString('utf8').split('\n');

const missingFile = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });

const answerJsonFiles = (contents) => jest.spyOn(fsPromises, 'readFile').mockImplementation(async (filePath) => {
  if (!(filePath in contents)) {
    throw missingFile();
  }
  return JSON.stringify(contents[filePath]);
});

const answerExistingPaths = (existingPaths) => jest.spyOn(fsPromises, 'stat').mockImplementation(async (filePath) => {
  if (!existingPaths.includes(filePath)) {
    throw missingFile();
  }
  return {};
});

describe('cloud folders', () => {
  beforeEach(() => {
    runCommand.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findCloudFolders', () => {
    it('syncs iCloud Drive, CloudStorage and every Dropbox folder on macOS, and adds iCloud Desktop & Documents to the placeholder folders', async () => {
      const readFile = answerJsonFiles({ '/Users/me/.dropbox/info.json': { personal: { path: '/Users/me/Dropbox' }, business: { path: '/Users/me/Dropbox (Team)' } } });
      const stat = answerExistingPaths([
        '/Users/me/Library/Mobile Documents/com~apple~CloudDocs/Desktop',
        '/Users/me/Library/Mobile Documents/com~apple~CloudDocs/Documents'
      ]);

      const folders = await findCloudFolders({ platform: 'darwin', homePath: '/Users/me', env: {} });

      const syncFolders = ['/Users/me/Library/Mobile Documents', '/Users/me/Library/CloudStorage', '/Users/me/Dropbox', '/Users/me/Dropbox (Team)'];
      expect(folders).toEqual({ syncFolders, placeholderFolders: [...syncFolders, '/Users/me/Desktop', '/Users/me/Documents'] });
      expect(readFile.mock.calls.map(([filePath]) => filePath)).toEqual(['/Users/me/.dropbox/info.json']);
      expect(stat.mock.calls.map(([filePath]) => filePath)).toEqual([
        '/Users/me/Library/Mobile Documents/com~apple~CloudDocs/Desktop',
        '/Users/me/Library/Mobile Documents/com~apple~CloudDocs/Documents'
      ]);
      expect(runCommand).not.toHaveBeenCalled();
    });

    it.each([
      ['there is no Dropbox info file', {}],
      ['the Dropbox info names no folder', { '/Users/me/.dropbox/info.json': { personal: {}, business: { path: 42 } } }]
    ])('adds only the home folders iCloud syncs to the placeholder folders on macOS when %s', async (_label, jsonFiles) => {
      answerJsonFiles(jsonFiles);
      answerExistingPaths(['/Users/me/Library/Mobile Documents/com~apple~CloudDocs/Documents']);

      const folders = await findCloudFolders({ platform: 'darwin', homePath: '/Users/me', env: {} });

      const syncFolders = ['/Users/me/Library/Mobile Documents', '/Users/me/Library/CloudStorage'];
      expect(folders).toEqual({ syncFolders, placeholderFolders: [...syncFolders, '/Users/me/Documents'] });
    });

    it('lists the OneDrive folders, the registered sync roots read through PowerShell and the folders in both Dropbox info files on Windows, each once', async () => {
      runCommand.mockResolvedValue(encode(['c:\\users\\me\\onedrive\\', 'D:\\Box', 'C:\\Users\\José\\iCloudDrive', 'not a drive path']));
      const readFile = answerJsonFiles({
        'C:\\Users\\me\\AppData\\Local\\Dropbox\\info.json': { business: { path: 'E:\\Dropbox (Work)' } },
        'C:\\Users\\me\\AppData\\Roaming\\Dropbox\\info.json': { personal: { path: 'F:\\Dropbox' }, business: { path: 'e:\\dropbox (work)' } }
      });
      const env = {
        SystemRoot: 'D:\\WINDOWS',
        OneDrive: 'C:\\Users\\me\\OneDrive',
        OneDriveCommercial: 'C:\\Users\\me\\OneDrive - Work',
        USERPROFILE: 'C:\\Users\\me',
        LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
        APPDATA: 'C:\\Users\\me\\AppData\\Roaming'
      };

      const folders = await findCloudFolders({ platform: 'win32', homePath: 'C:\\Users\\home', env });

      const syncFolders = [
        'C:\\Users\\me\\OneDrive',
        'C:\\Users\\me\\OneDrive - Work',
        'D:\\Box',
        'C:\\Users\\José\\iCloudDrive',
        'E:\\Dropbox (Work)',
        'F:\\Dropbox'
      ];
      expect(folders).toEqual({ syncFolders, placeholderFolders: syncFolders });
      expect(runCommand).toHaveBeenCalledTimes(1);
      const [file, args, timeout] = runCommand.mock.calls[0];
      expect(file).toBe('D:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
      expect(args.slice(0, 3)).toEqual(['-NoProfile', '-NonInteractive', '-Command']);
      expect(args[3]).toContain('SyncRootManager\\*\\UserSyncRoots');
      expect(timeout).toBe(10000);
      expect(readFile.mock.calls.map(([filePath]) => filePath)).toEqual([
        'C:\\Users\\me\\AppData\\Local\\Dropbox\\info.json',
        'C:\\Users\\me\\AppData\\Roaming\\Dropbox\\info.json'
      ]);
    });

    it('still lists OneDrive under the home folder on Windows when PowerShell fails and the environment is stripped', async () => {
      runCommand.mockResolvedValue(null);
      const readFile = jest.spyOn(fsPromises, 'readFile');

      const folders = await findCloudFolders({ platform: 'win32', homePath: 'C:\\Users\\me', env: {} });

      expect(folders).toEqual({ syncFolders: ['C:\\Users\\me\\OneDrive'], placeholderFolders: ['C:\\Users\\me\\OneDrive'] });
      expect(readFile).not.toHaveBeenCalled();
    });

    it('syncs every Dropbox folder on Linux, and has no placeholder folders', async () => {
      const readFile = answerJsonFiles({ '/home/me/.dropbox/info.json': { personal: { path: '/home/me/Dropbox' }, business: { path: '/home/me/Dropbox (Team)' } } });
      const stat = jest.spyOn(fsPromises, 'stat');

      const folders = await findCloudFolders({ platform: 'linux', homePath: '/home/me', env: {} });

      expect(folders).toEqual({ syncFolders: ['/home/me/Dropbox', '/home/me/Dropbox (Team)'], placeholderFolders: [] });
      expect(readFile.mock.calls.map(([filePath]) => filePath)).toEqual(['/home/me/.dropbox/info.json']);
      expect(runCommand).not.toHaveBeenCalled();
      expect(stat).not.toHaveBeenCalled();
    });

    it('lists nothing on Linux without Dropbox, or on other platforms', async () => {
      const readFile = answerJsonFiles({});

      expect(await findCloudFolders({ platform: 'linux', homePath: '/home/me', env: {} })).toEqual({ syncFolders: [], placeholderFolders: [] });
      expect(await findCloudFolders({ platform: 'freebsd', homePath: '/home/me', env: {} })).toEqual({ syncFolders: [], placeholderFolders: [] });
      expect(readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('isDatalessFile', () => {
    it.each([
      ['is dataless', 'dataless\n', true],
      ['is dataless among other flags', 'compressed,dataless\n', true],
      ['has no flags', '-\n', false],
      ['has other flags', 'compressed\n', false],
      ['cannot be checked', null, true]
    ])('checks the flags of a file that %s', async (_label, flags, dataless) => {
      runCommand.mockResolvedValue(flags);
      const filePath = '/Users/me/Desktop/api/bruno.json';

      expect(await isDatalessFile(filePath)).toBe(dataless);
      expect(runCommand.mock.calls).toEqual([['/usr/bin/stat', ['-L', '-f', '%Sf', filePath], 2000]]);
    });
  });

  describe('findCloudOnlyFiles', () => {
    const files = ['C:\\Users\\José\\OneDrive\\api\\bruno.json', 'C:\\Users\\José\\OneDrive\\shop\\opencollection.yml'];

    it('passes the files to PowerShell as base64 in the environment and returns the ones it reports', async () => {
      runCommand.mockResolvedValue(encode([files[1]]));

      const cloudOnly = await findCloudOnlyFiles(files);

      expect([...cloudOnly]).toEqual([files[1]]);
      expect(runCommand).toHaveBeenCalledTimes(1);
      const [file, args, timeout, env] = runCommand.mock.calls[0];
      expect(file).toMatch(POWERSHELL_PATTERN);
      expect(args[3]).toContain('$env:BRUNO_CLOUD_CHECK_FILES');
      expect(args[3]).toContain('0x441000');
      expect(timeout).toBe(10000);
      expect(env).toMatchObject({ ...process.env });
      expect(decodeCheckedFiles(runCommand.mock.calls[0])).toEqual(files);
    });

    it('returns no files when PowerShell reports none', async () => {
      runCommand.mockResolvedValue('\r\n');

      expect([...(await findCloudOnlyFiles(files))]).toEqual([]);
    });

    it('counts every file as cloud only when PowerShell fails', async () => {
      runCommand.mockResolvedValue(null);

      expect([...(await findCloudOnlyFiles(files))]).toEqual(files);
    });

    it('splits a long list across several PowerShell calls that each fit in one environment variable', async () => {
      const manyFiles = Array.from({ length: 600 }, (_value, index) => `C:\\Users\\me\\OneDrive\\collections\\collection-${index}\\bruno.json`);
      runCommand.mockResolvedValue('');

      await findCloudOnlyFiles(manyFiles);

      expect(runCommand.mock.calls.length).toBeGreaterThan(1);
      runCommand.mock.calls.forEach(([, , , env]) => expect(env.BRUNO_CLOUD_CHECK_FILES.length).toBeLessThanOrEqual(30000));
      expect(runCommand.mock.calls.flatMap(decodeCheckedFiles)).toEqual(manyFiles);
    });

    it('runs nothing for no files', async () => {
      expect([...(await findCloudOnlyFiles([]))]).toEqual([]);
      expect(runCommand).not.toHaveBeenCalled();
    });
  });
});
