const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() }
}));

const { resolveWsdlSchemaRef } = require('../../src/ipc/wsdl');

describe('resolveWsdlSchemaRef', () => {
  let dir;
  let wsdlPath;
  let commonPath;

  beforeAll(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-wsdl-')));
    fs.mkdirSync(path.join(dir, 'wsdl'));
    fs.mkdirSync(path.join(dir, 'schema'));
    wsdlPath = path.join(dir, 'wsdl', 'Service.wsdl');
    commonPath = path.join(dir, 'schema', 'Common.xsd');
    fs.writeFileSync(wsdlPath, '<definitions/>');
    fs.writeFileSync(commonPath, '<schema/>');
    fs.writeFileSync(path.join(dir, 'secret.txt'), 'SECRET');
    fs.writeFileSync(path.join(dir, 'wsdl', 'Published.xsd'), '<published/>');
    fs.writeFileSync(path.join(dir, 'Outside.xsd'), '<outside/>');
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('joins a ref against an absolute path base and against a file:// base', async () => {
    const firstHop = await resolveWsdlSchemaRef(wsdlPath, '../schema/Common.xsd');

    expect(firstHop.text).toBe('<schema/>');
    expect(firstHop.uri).toBe(pathToFileURL(commonPath).href);
    expect(firstHop.key).toBe(pathToFileURL(commonPath).href);

    const secondHop = await resolveWsdlSchemaRef(firstHop.uri, '../wsdl/Service.wsdl');

    expect(secondHop.text).toBe('<definitions/>');
    expect(secondHop.uri).toBe(pathToFileURL(wsdlPath).href);
    expect(secondHop.key).toBe(pathToFileURL(wsdlPath).href);
  });

  it('refuses a ref pointing at a non-schema file', async () => {
    await expect(resolveWsdlSchemaRef(wsdlPath, '../secret.txt')).rejects.toThrow(
      /must point at a .xsd\/.wsdl file/
    );
  });

  it('resolves a remote ref to a same-named local copy next to the base document', async () => {
    const localCopyPath = path.join(dir, 'wsdl', 'Published.xsd');
    const firstHop = await resolveWsdlSchemaRef(wsdlPath, 'http://example.com/schemas/Published.xsd');

    expect(firstHop.text).toBe('<published/>');
    expect(firstHop.uri).toBe(pathToFileURL(localCopyPath).href);
    expect(firstHop.key).toBe(pathToFileURL(localCopyPath).href);

    const secondHop = await resolveWsdlSchemaRef(firstHop.uri, '../schema/Common.xsd');

    expect(secondHop.text).toBe('<schema/>');
  });

  it('refuses a remote ref without a local copy', async () => {
    await expect(resolveWsdlSchemaRef(wsdlPath, 'https://example.com/schemas/Missing.xsd')).rejects.toThrow(
      /no local copy was found/
    );
  });

  it('keeps the local copy lookup inside the base document directory', async () => {
    await expect(resolveWsdlSchemaRef(wsdlPath, 'https://example.com/%2E%2E%2FOutside.xsd')).rejects.toThrow(
      /no local copy was found/
    );
    await expect(resolveWsdlSchemaRef(wsdlPath, 'https://example.com/%5C..%5COutside.xsd')).rejects.toThrow(
      /no local copy was found/
    );
  });
});
