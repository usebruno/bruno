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

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-wsdl-'));
    fs.mkdirSync(path.join(dir, 'wsdl'));
    fs.mkdirSync(path.join(dir, 'schema'));
    wsdlPath = path.join(dir, 'wsdl', 'Service.wsdl');
    fs.writeFileSync(wsdlPath, '<definitions/>');
    fs.writeFileSync(path.join(dir, 'schema', 'Common.xsd'), '<schema/>');
    fs.writeFileSync(path.join(dir, 'secret.txt'), 'SECRET');
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('joins a ref against an absolute path base and against a file:// base', async () => {
    const firstHop = await resolveWsdlSchemaRef(wsdlPath, '../schema/Common.xsd');

    expect(firstHop.text).toBe('<schema/>');
    expect(firstHop.uri).toBe(pathToFileURL(path.join(dir, 'schema', 'Common.xsd')).href);

    const secondHop = await resolveWsdlSchemaRef(firstHop.uri, '../wsdl/Service.wsdl');

    expect(secondHop.text).toBe('<definitions/>');
    expect(secondHop.uri).toBe(pathToFileURL(wsdlPath).href);
  });

  it('refuses a ref pointing at a non-schema file', async () => {
    await expect(resolveWsdlSchemaRef(wsdlPath, '../secret.txt')).rejects.toThrow(
      /must point at a .xsd\/.wsdl file/
    );
  });
});
