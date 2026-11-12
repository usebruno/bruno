const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readCollectionName } = require('./collection-name');

const canMakePipes = process.platform !== 'win32';

describe('readCollectionName', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-collection-name-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  const collectionWith = (files) => {
    const folderPath = path.join(tempDir, 'my-collection');
    fs.mkdirSync(folderPath, { recursive: true });
    Object.entries(files).forEach(([name, content]) => fs.writeFileSync(path.join(folderPath, name), content));
    return folderPath;
  };

  it('reads info.name from opencollection.yml', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'opencollection: 1.0.0\ninfo:\n  summary: Orders API\n  name: Orders\n' });

    expect(await readCollectionName(folderPath)).toBe('Orders');
  });

  it('removes the quotes around a yml name', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'info:\n  name: "Orders: v2"\n' });

    expect(await readCollectionName(folderPath)).toBe('Orders: v2');
  });

  it('trims the spaces around a yml name', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'info:\n  name:    Orders   \n' });

    expect(await readCollectionName(folderPath)).toBe('Orders');
  });

  it.each([
    ['escaped quotes', 'name: "Orders \\"v2\\""', 'Orders "v2"'],
    ['a trailing comment', 'name: Orders # main API', 'Orders'],
    ['an unquoted colon', 'name: Orders: v2', 'Orders: v2'],
    ['text that looks like a YAML marker', 'name: --- Orders', '--- Orders'],
    ['only digits', 'name: 2024', '2024']
  ])('reads a yml name with %s', async (_description, line, expected) => {
    const folderPath = collectionWith({ 'opencollection.yml': `info:\n  ${line}\n` });

    expect(await readCollectionName(folderPath)).toBe(expected);
  });

  it('reads a top-level yml name when there is no info.name', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'name: \'Legacy\'\n' });

    expect(await readCollectionName(folderPath)).toBe('Legacy');
  });

  it('reads a yml file written with Windows line endings', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'opencollection: 1.0.0\r\ninfo:\r\n  summary: Orders API\r\n  name: Orders\r\n' });

    expect(await readCollectionName(folderPath)).toBe('Orders');
  });

  it('prefers opencollection.yml over bruno.json', async () => {
    const folderPath = collectionWith({
      'opencollection.yml': 'info:\n  name: From yml\n',
      'bruno.json': JSON.stringify({ name: 'From json' })
    });

    expect(await readCollectionName(folderPath)).toBe('From yml');
  });

  (canMakePipes ? it : it.skip).each([
    ['a named pipe', (folderPath) => execFileSync('mkfifo', [path.join(folderPath, 'opencollection.yml')])],
    ['a link to a named pipe', (folderPath) => {
      const pipePath = path.join(tempDir, 'pipe');
      execFileSync('mkfifo', [pipePath]);
      fs.symlinkSync(pipePath, path.join(folderPath, 'opencollection.yml'));
    }]
  ])('reads bruno.json when opencollection.yml is %s', async (_description, makeYml) => {
    const folderPath = collectionWith({ 'bruno.json': JSON.stringify({ name: 'Payments' }) });
    makeYml(folderPath);

    expect(await readCollectionName(folderPath)).toBe('Payments');
  });

  it('reads the name from bruno.json', async () => {
    const folderPath = collectionWith({ 'bruno.json': JSON.stringify({ version: '1', name: ' Payments ', type: 'collection' }) });

    expect(await readCollectionName(folderPath)).toBe('Payments');
  });

  it('finds the name in a bruno.json that is not valid JSON', async () => {
    const folderPath = collectionWith({ 'bruno.json': '{ "version": "1", "name": "Payments", ' });

    expect(await readCollectionName(folderPath)).toBe('Payments');
  });

  it.each([
    ['a bruno.json without a name', { 'bruno.json': JSON.stringify({ version: '1' }) }],
    ['an opencollection.yml without a name', { 'opencollection.yml': 'opencollection: 1.0.0\n' }],
    ['no config file it can read', {}]
  ])('uses the folder name for %s', async (_description, files) => {
    const folderPath = collectionWith(files);

    expect(await readCollectionName(folderPath)).toBe('my-collection');
  });
});
