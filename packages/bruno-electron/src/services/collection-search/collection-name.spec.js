const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readCollectionName } = require('./collection-name');

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
    ['text that looks like a YAML marker', 'name: --- Orders', '--- Orders'],
    ['only digits', 'name: 2024', '2024']
  ])('reads a yml name with %s', async (_description, line, expected) => {
    const folderPath = collectionWith({ 'opencollection.yml': `info:\n  ${line}\n` });

    expect(await readCollectionName(folderPath)).toBe(expected);
  });

  it.each([
    ['only a top-level name', 'name: \'Legacy\'\n'],
    ['no name', 'opencollection: 1.0.0\n']
  ])('names a yml collection with %s the way opening it does', async (_description, yml) => {
    const folderPath = collectionWith({ 'opencollection.yml': yml });

    expect(await readCollectionName(folderPath)).toBe('Untitled Collection');
  });

  it('uses the folder name when opencollection.yml is not valid YAML', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const folderPath = collectionWith({ 'opencollection.yml': 'info:\n  name: Orders: v2\n' });

    expect(await readCollectionName(folderPath)).toBe('my-collection');

    consoleError.mockRestore();
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
    ['no config file it can read', {}]
  ])('uses the folder name for %s', async (_description, files) => {
    const folderPath = collectionWith(files);

    expect(await readCollectionName(folderPath)).toBe('my-collection');
  });
});
