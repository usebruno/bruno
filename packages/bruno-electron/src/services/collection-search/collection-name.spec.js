const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readCollectionConfig } = require('./collection-name');

describe('readCollectionConfig', () => {
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

  const nameOf = async (folderPath) => (await readCollectionConfig(folderPath)).name;

  it('reads info.name from opencollection.yml', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'opencollection: 1.0.0\ninfo:\n  summary: Orders API\n  name: Orders\n' });

    expect(await readCollectionConfig(folderPath)).toEqual({ name: 'Orders', isBroken: false });
  });

  it('removes the quotes around a yml name', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'info:\n  name: "Orders: v2"\n' });

    expect(await nameOf(folderPath)).toBe('Orders: v2');
  });

  it('trims the spaces around a yml name', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'info:\n  name:    Orders   \n' });

    expect(await nameOf(folderPath)).toBe('Orders');
  });

  it.each([
    ['escaped quotes', 'name: "Orders \\"v2\\""', 'Orders "v2"'],
    ['a trailing comment', 'name: Orders # main API', 'Orders'],
    ['text that looks like a YAML marker', 'name: --- Orders', '--- Orders'],
    ['only digits', 'name: 2024', '2024']
  ])('reads a yml name with %s', async (_description, line, expected) => {
    const folderPath = collectionWith({ 'opencollection.yml': `info:\n  ${line}\n` });

    expect(await nameOf(folderPath)).toBe(expected);
  });

  it.each([
    ['only a top-level name', 'name: \'Legacy\'\n'],
    ['no name', 'opencollection: 1.0.0\n']
  ])('names a yml collection with %s the way opening it does', async (_description, yml) => {
    const folderPath = collectionWith({ 'opencollection.yml': yml });

    expect(await nameOf(folderPath)).toBe('Untitled Collection');
  });

  it('lists a config bigger than it reads without judging it, named after its folder', async () => {
    const docs = 'Notes: '.repeat(20000);
    const folderPath = collectionWith({ 'opencollection.yml': `info:\n  name: Orders\ndocs:\n  content: "${docs}"\n` });

    expect(await readCollectionConfig(folderPath)).toEqual({ name: 'my-collection', isBroken: false });
  });

  it('reads a yml file written with Windows line endings', async () => {
    const folderPath = collectionWith({ 'opencollection.yml': 'opencollection: 1.0.0\r\ninfo:\r\n  summary: Orders API\r\n  name: Orders\r\n' });

    expect(await nameOf(folderPath)).toBe('Orders');
  });

  it('prefers opencollection.yml over bruno.json', async () => {
    const folderPath = collectionWith({
      'opencollection.yml': 'info:\n  name: From yml\n',
      'bruno.json': JSON.stringify({ name: 'From json' })
    });

    expect(await nameOf(folderPath)).toBe('From yml');
  });

  it('reads the name from bruno.json the way opening it does', async () => {
    const folderPath = collectionWith({ 'bruno.json': JSON.stringify({ version: '1', name: ' Payments ', type: 'collection' }) });

    expect(await readCollectionConfig(folderPath)).toEqual({ name: ' Payments ', isBroken: false });
  });

  it('gives a bruno.json name that is not a string as text', async () => {
    const folderPath = collectionWith({ 'bruno.json': JSON.stringify({ version: '1', name: 2024, type: 'collection' }) });

    expect(await readCollectionConfig(folderPath)).toEqual({ name: '2024', isBroken: false });
  });

  it('marks a collection broken when opencollection.yml is not a file, as opening fails on it', async () => {
    const folderPath = collectionWith({ 'bruno.json': JSON.stringify({ version: '1', name: 'Payments', type: 'collection' }) });
    fs.mkdirSync(path.join(folderPath, 'opencollection.yml'));

    expect(await readCollectionConfig(folderPath)).toEqual({ name: 'my-collection', isBroken: true });
  });

  it.each([
    ['an opencollection.yml that is not valid YAML', { 'opencollection.yml': 'info:\n  name: Orders: v2\n' }],
    ['an empty opencollection.yml next to a valid bruno.json', {
      'opencollection.yml': '',
      'bruno.json': JSON.stringify({ version: '1', name: 'Payments', type: 'collection' })
    }],
    ['a bruno.json that is not valid JSON', { 'bruno.json': '{ "version": "1", "name": "Payments", ' }],
    ['a bruno.json without a name', { 'bruno.json': JSON.stringify({ version: '1', type: 'collection' }) }],
    ['a bruno.json without a type', { 'bruno.json': JSON.stringify({ version: '1', name: 'Payments' }) }],
    ['no config file it can read', {}]
  ])('marks %s as a config that cannot be opened, named after its folder', async (_description, files) => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const folderPath = collectionWith(files);

    expect(await readCollectionConfig(folderPath)).toEqual({ name: 'my-collection', isBroken: true });

    consoleError.mockRestore();
  });
});
