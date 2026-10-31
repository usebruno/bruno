const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const { resolveLocalWsdlSchemaRef } = require('../../src/commands/import');

// Mirrors bruno-electron/tests/ipc/wsdl.test.js
describe('resolveLocalWsdlSchemaRef', () => {
  let dir;
  let wsdlPath;
  let commonPath;

  beforeAll(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-wsdl-')));
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
    const firstHop = await resolveLocalWsdlSchemaRef(wsdlPath, '../schema/Common.xsd');

    expect(firstHop.text).toBe('<schema/>');
    expect(firstHop.uri).toBe(pathToFileURL(commonPath).href);
    expect(firstHop.key).toBe(pathToFileURL(commonPath).href);

    const secondHop = await resolveLocalWsdlSchemaRef(firstHop.uri, '../wsdl/Service.wsdl');

    expect(secondHop.text).toBe('<definitions/>');
    expect(secondHop.uri).toBe(pathToFileURL(wsdlPath).href);
    expect(secondHop.key).toBe(pathToFileURL(wsdlPath).href);
  });

  it('refuses a ref pointing at a non-schema file', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, '../secret.txt')).rejects.toThrow(
      /must point at a .xsd\/.wsdl file/
    );
  });

  it('resolves a remote ref to a same-named local copy next to the base document', async () => {
    const localCopyPath = path.join(dir, 'wsdl', 'Published.xsd');
    const firstHop = await resolveLocalWsdlSchemaRef(wsdlPath, 'http://example.com/schemas/Published.xsd');

    expect(firstHop.text).toBe('<published/>');
    expect(firstHop.uri).toBe(pathToFileURL(localCopyPath).href);
    expect(firstHop.key).toBe(pathToFileURL(localCopyPath).href);

    const secondHop = await resolveLocalWsdlSchemaRef(firstHop.uri, '../schema/Common.xsd');

    expect(secondHop.text).toBe('<schema/>');
  });

  it('refuses a remote ref without a local copy', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, 'https://example.com/schemas/Missing.xsd')).rejects.toThrow(
      /no local copy was found/
    );
  });

  it('keeps the local copy lookup inside the base document directory', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, 'https://example.com/%2E%2E%2FOutside.xsd')).rejects.toThrow(
      /no local copy was found/
    );
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, 'https://example.com/%5C..%5COutside.xsd')).rejects.toThrow(
      /no local copy was found/
    );

    const encodedBackslash = await resolveLocalWsdlSchemaRef(wsdlPath, 'https://example.com/%5C..%5CPublished.xsd');

    expect(encodedBackslash.uri).toBe(pathToFileURL(path.join(dir, 'wsdl', 'Published.xsd')).href);
  });

  it('refuses a remote ref to a non-schema file without revealing whether it exists', async () => {
    const rootDocumentPath = path.join(dir, 'Root.wsdl');

    await expect(resolveLocalWsdlSchemaRef(rootDocumentPath, 'https://example.com/secret.txt')).rejects.toThrow(
      /must point at a .xsd\/.wsdl file/
    );
    await expect(resolveLocalWsdlSchemaRef(rootDocumentPath, 'https://example.com/missing.txt')).rejects.toThrow(
      /must point at a .xsd\/.wsdl file/
    );
  });

  it('refuses remote refs that are not http(s)', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, 'ftp://example.com/Published.xsd')).rejects.toThrow(
      /Remote schema references are not supported \(/
    );
  });

  it('refuses a file ref on another host', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, 'file://other-host/schemas/Common.xsd')).rejects.toThrow(
      /must stay on the importing document's host/
    );
  });

  it('rejects a non-string base uri', async () => {
    await expect(resolveLocalWsdlSchemaRef(undefined, '../schema/Common.xsd')).rejects.toThrow(
      /Invalid base URI/
    );
  });

  it('rejects a non-string schema reference', async () => {
    await expect(resolveLocalWsdlSchemaRef(wsdlPath, undefined)).rejects.toThrow(/Invalid schema reference/);
  });
});
