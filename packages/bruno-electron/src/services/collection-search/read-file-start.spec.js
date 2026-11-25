const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readFileStart } = require('./read-file-start');

const canMakePipes = process.platform !== 'win32';

describe('readFileStart', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-read-file-start-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it('reads the start of a file', async () => {
    const filePath = path.join(tempDir, 'notes.txt');
    fs.writeFileSync(filePath, 'hello world');

    expect(await readFileStart(filePath, 5)).toBe('hello');
  });

  it('gives empty text for a folder or a missing file', async () => {
    expect(await readFileStart(tempDir, 5)).toBe('');
    expect(await readFileStart(path.join(tempDir, 'missing.json'), 5)).toBe('');
  });

  (canMakePipes ? it : it.skip)('gives empty text for a named pipe or a link to one instead of waiting on it', async () => {
    const pipePath = path.join(tempDir, 'pipe');
    const linkPath = path.join(tempDir, 'link');
    execFileSync('mkfifo', [pipePath]);
    fs.symlinkSync(pipePath, linkPath);

    expect(await readFileStart(pipePath, 5)).toBe('');
    expect(await readFileStart(linkPath, 5)).toBe('');
  });
});
