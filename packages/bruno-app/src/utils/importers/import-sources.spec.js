import { callIpc } from 'utils/common/ipc';
import { fetchAndValidateApiSpecFromUrl } from './common';
import { readImportableFile, readImportFiles, readImportUrl } from './import-sources';

jest.mock('utils/common/ipc', () => ({ callIpc: jest.fn() }));
jest.mock('./common', () => ({ ...jest.requireActual('./common'), fetchAndValidateApiSpecFromUrl: jest.fn() }));

const openApi = { openapi: '3.0.0', info: { title: 'Orders', version: '1' }, paths: {} };
const swagger = { swagger: '2.0', info: { title: 'Orders', version: '1' }, paths: {} };
const postman = { info: { name: 'Orders', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [] };
const insomnia = { _type: 'export', __export_format: 4, resources: [] };
const openCollection = { opencollection: '1.0.0', info: { name: 'Orders' } };
const wsdl = '<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"><wsdl:types/></wsdl:definitions>';

const file = (name, content = '') => ({
  name,
  type: '',
  text: () => Promise.resolve(typeof content === 'string' ? content : JSON.stringify(content))
});

describe('import sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.ipcRenderer = { getFilePath: (picked) => `/files/${picked.name}` };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  describe('readImportFiles', () => {
    it('keeps the path and text of an OpenAPI file', async () => {
      const text = JSON.stringify(openApi);

      await expect(readImportFiles([file('openapi.json', text)])).resolves.toEqual({
        rawData: openApi,
        type: 'openapi',
        filePath: '/files/openapi.json',
        rawContent: text
      });
    });

    it('keeps the path of a WSDL file', async () => {
      await expect(readImportFiles([file('orders.wsdl', wsdl)])).resolves.toEqual({
        rawData: wsdl,
        type: 'wsdl',
        filePath: '/files/orders.wsdl'
      });
    });

    it.each([
      ['postman', postman],
      ['insomnia', insomnia],
      ['opencollection', openCollection]
    ])('recognises a %s file', async (type, data) => {
      await expect(readImportFiles([file('export.json', data)])).resolves.toEqual({ rawData: data, type });
    });

    it('says when a file is in no format it knows', async () => {
      await expect(readImportFiles([file('notes.json', { hello: 'world' })])).rejects.toThrow('Unsupported collection format');
    });

    it('recognises an OpenCollection export marked as bundled', async () => {
      const exported = { ...openCollection, bundled: true };

      await expect(readImportFiles([file('orders.yml', exported)])).resolves.toEqual({ rawData: exported, type: 'opencollection' });
    });

    it('treats a collection\'s own opencollection.yml like its bruno.json, as a file it cannot import', async () => {
      await expect(readImportFiles([file('opencollection.yml', { ...openCollection, bundled: false })])).rejects.toThrow('Unsupported collection format');
      await expect(readImportFiles([file('bruno.json', { version: '1', name: 'Orders', type: 'collection' })])).rejects.toThrow('Unsupported collection format');
    });

    it('skips a collection\'s own opencollection.yml when several files are picked', async () => {
      const result = await readImportFiles([file('orders.json', postman), file('opencollection.yml', { ...openCollection, bundled: false })]);

      expect(result).toMatchObject({ type: 'multiple', skippedFileNames: ['opencollection.yml'] });
    });

    it('says when a file holds nothing usable', async () => {
      await expect(readImportFiles([file('empty.json', 'null')])).rejects.toThrow('Failed to parse file content');
    });

    it('passes on a parse failure', async () => {
      await expect(readImportFiles([file('broken.json', '{ nope')])).rejects.toThrow('ensure it is valid JSON or YAML');
    });

    it('accepts a Bruno ZIP, whatever the case of its extension', async () => {
      callIpc.mockResolvedValue(true);

      await expect(readImportFiles([file('Orders.ZIP')])).resolves.toEqual({
        rawData: { zipFilePath: '/files/Orders.ZIP', collectionName: 'Orders' },
        type: 'bruno-zip'
      });
      expect(callIpc).toHaveBeenCalledWith('renderer:is-bruno-collection-zip', '/files/Orders.ZIP');
    });

    it('refuses a ZIP that is not a Bruno collection', async () => {
      callIpc.mockResolvedValue(false);

      await expect(readImportFiles([file('other.zip')])).rejects.toThrow('The ZIP file is not a valid Bruno collection');
    });

    it('refuses a ZIP mixed with other files', async () => {
      await expect(readImportFiles([file('a.zip'), file('b.json', postman)])).rejects.toThrow('Cannot mix ZIP files');
    });

    it('refuses several ZIPs', async () => {
      await expect(readImportFiles([file('a.zip'), file('b.zip')])).rejects.toThrow('Multiple ZIP files selected');
    });

    it('collects the usable files when several are picked', async () => {
      const spec = file('openapi.json', openApi);
      const collection = file('postman.json', postman);

      const result = await readImportFiles([spec, file('notes.json', { hello: 'world' }), file('broken.json', '{ nope'), collection]);

      expect(result).toEqual({
        type: 'multiple',
        filesData: [
          { file: spec, data: openApi, type: 'openapi', filePath: '/files/openapi.json', rawContent: JSON.stringify(openApi) },
          { file: collection, data: postman, type: 'postman', filePath: '/files/postman.json', rawContent: undefined }
        ],
        skippedFileNames: ['notes.json', 'broken.json']
      });
    });

    it('leaves out the text of a Swagger 2.0 file when several are picked', async () => {
      const result = await readImportFiles([file('swagger.json', swagger), file('postman.json', postman)]);

      expect(result.filesData[0]).toMatchObject({ type: 'openapi', rawContent: undefined });
    });

    it('says when none of several files can be used', async () => {
      await expect(readImportFiles([file('a.json', {}), file('b.json', {})])).rejects.toThrow('No valid collections found');
    });
  });

  describe('readImportUrl', () => {
    const url = 'https://example.com/openapi.yaml';

    it('fetches a URL and keeps where it came from', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: openApi, specType: 'openapi', rawContent: 'raw' });

      await expect(readImportUrl(`  ${url}  `)).resolves.toEqual({ rawData: openApi, type: 'openapi', sourceUrl: url, rawContent: 'raw' });
      expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledWith({ url });
    });

    it.each([
      ['a malformed URL', 'http://'],
      ['pasted file content', 'openapi: 3.0.0\ninfo:\n  title: Orders']
    ])('refuses %s without fetching', async (_description, text) => {
      await expect(readImportUrl(text)).rejects.toThrow('Please enter a valid URL');
      expect(fetchAndValidateApiSpecFromUrl).not.toHaveBeenCalled();
    });

    it.each([
      ['the host cannot be found', 'getaddrinfo ENOTFOUND example.com', 'Could not find example.com. Check the address for a typo.'],
      ['the server answers with an error', 'Request failed with status code 404', 'example.com responded with 404.'],
      ['anything else goes wrong', 'socket hang up', 'Could not fetch a specification from example.com.']
    ])('says why the fetch failed when %s', async (_description, cause, message) => {
      fetchAndValidateApiSpecFromUrl.mockRejectedValue(new Error(`Failed to fetch API specification: ${cause}`));

      await expect(readImportUrl(url)).rejects.toThrow(message);
    });

    it('says when a fetched document is in no format it knows', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: { hello: 'world' }, specType: 'unknown', rawContent: 'raw' });

      await expect(readImportUrl(url)).rejects.toThrow('Unsupported collection format');
    });

    it('does not mistake a fetched web page for WSDL', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: '<html>definitions</html>', specType: 'unknown', rawContent: 'raw' });

      await expect(readImportUrl(url)).rejects.toThrow('Unsupported collection format');
    });

    it('says when a fetched document is empty', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: null, specType: 'unknown', rawContent: '~' });

      await expect(readImportUrl(url)).rejects.toThrow('Unsupported collection format');
    });

    it('recognises a fetched OpenCollection document', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: openCollection, specType: 'unknown', rawContent: 'raw' });

      await expect(readImportUrl(url)).resolves.toMatchObject({ type: 'opencollection', sourceUrl: url });
    });
  });

  describe('readImportableFile', () => {
    it('reads a file by its path', async () => {
      const text = JSON.stringify(openApi);
      callIpc.mockResolvedValue(text);

      await expect(readImportableFile({ path: '/work/openapi.json', name: 'openapi.json' })).resolves.toEqual({
        rawData: openApi,
        type: 'openapi',
        filePath: '/work/openapi.json',
        rawContent: text
      });
      expect(callIpc).toHaveBeenCalledWith('renderer:collection-search:read-importable-file', { path: '/work/openapi.json' });
    });

    it('reads a file with an upper case .JSON extension as JSON', async () => {
      callIpc.mockResolvedValue('{"openapi":"3.0.0","info":{"title":"A","title":"B","version":"1"},"paths":{}}');

      await expect(readImportableFile({ path: '/work/OPENAPI.JSON', name: 'OPENAPI.JSON' })).resolves.toMatchObject({ type: 'openapi' });
    });

    it('hands a ZIP over by its path', async () => {
      callIpc.mockResolvedValue(true);

      await expect(readImportableFile({ path: '/work/orders.zip', name: 'orders.zip' })).resolves.toEqual({
        rawData: { zipFilePath: '/work/orders.zip', collectionName: 'orders' },
        type: 'bruno-zip'
      });
    });
  });
});
