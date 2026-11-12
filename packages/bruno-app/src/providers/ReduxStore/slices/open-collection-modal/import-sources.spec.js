import { callIpc } from 'utils/common/ipc';
import { fetchAndValidateApiSpecFromUrl } from 'utils/importers/common';
import { describeImportText, readImportableFile, readImportFiles, readImportText } from './import-sources';

jest.mock('utils/common/ipc', () => ({ callIpc: jest.fn() }));
jest.mock('utils/importers/common', () => ({ fetchAndValidateApiSpecFromUrl: jest.fn() }));

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

  describe('readImportText', () => {
    const url = 'https://example.com/openapi.yaml';

    it('fetches a URL and keeps where it came from', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: openApi, specType: 'openapi', rawContent: 'raw' });

      await expect(readImportText(`  ${url}  `)).resolves.toEqual({ rawData: openApi, type: 'openapi', sourceUrl: url, rawContent: 'raw' });
      expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledWith({ url });
    });

    it('refuses a malformed URL without fetching', async () => {
      await expect(readImportText('http://')).rejects.toThrow('Please enter a valid URL');
      expect(fetchAndValidateApiSpecFromUrl).not.toHaveBeenCalled();
    });

    it('says when the fetch fails', async () => {
      fetchAndValidateApiSpecFromUrl.mockRejectedValue(new Error('404'));

      await expect(readImportText(url)).rejects.toThrow('URL import failed. Please check the URL and try again.');
    });

    it('says when a fetched document is in no format it knows', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: { hello: 'world' }, specType: 'unknown', rawContent: 'raw' });

      await expect(readImportText(url)).rejects.toThrow('Unsupported collection format');
    });

    it('does not mistake a fetched web page for WSDL', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: '<html>definitions</html>', specType: 'unknown', rawContent: 'raw' });

      await expect(readImportText(url)).rejects.toThrow('Unsupported collection format');
    });

    it('recognises a fetched OpenCollection document', async () => {
      fetchAndValidateApiSpecFromUrl.mockResolvedValue({ data: openCollection, specType: 'unknown', rawContent: 'raw' });

      await expect(readImportText(url)).resolves.toMatchObject({ type: 'opencollection', sourceUrl: url });
    });

    it('reads pasted JSON', async () => {
      const text = JSON.stringify(postman);

      await expect(readImportText(text)).resolves.toEqual({ rawData: postman, type: 'postman', rawContent: text });
    });

    it('reads pasted JSON with a duplicate key', async () => {
      const text = '{"openapi":"3.0.0","info":{"title":"A","title":"B","version":"1"},"paths":{}}';

      await expect(readImportText(text)).resolves.toMatchObject({ type: 'openapi' });
    });

    it('reads pasted YAML', async () => {
      const text = 'openapi: 3.0.0\ninfo:\n  title: Orders\n  version: "1"\npaths: {}';

      await expect(readImportText(text)).resolves.toMatchObject({ type: 'openapi', rawContent: text });
    });

    it.each([
      ['plain words', 'just some words'],
      ['broken YAML', 'a: [unclosed']
    ])('says when %s cannot be parsed', async (_description, text) => {
      await expect(readImportText(text)).rejects.toThrow('Could not parse the text as JSON or YAML');
    });

    it('says when pasted text is in no format it knows', async () => {
      await expect(readImportText('{ "hello": "world" }')).rejects.toThrow('Unsupported collection format');
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

    it('hands a ZIP over by its path', async () => {
      callIpc.mockResolvedValue(true);

      await expect(readImportableFile({ path: '/work/orders.zip', name: 'orders.zip' })).resolves.toEqual({
        rawData: { zipFilePath: '/work/orders.zip', collectionName: 'orders' },
        type: 'bruno-zip'
      });
    });
  });

  describe('describeImportText', () => {
    it.each([
      ['https://a.dev/spec.yaml', 'YAML from a URL · a Bruno collection is unpacked, an OpenAPI spec is converted'],
      ['https://a.dev/spec.yml?x=1', 'YAML from a URL · a Bruno collection is unpacked, an OpenAPI spec is converted'],
      ['https://a.dev/spec.json', 'JSON from a URL · Bruno detects Postman, Insomnia or OpenAPI'],
      ['https://a.dev/spec', 'URL · Bruno fetches it and detects the format'],
      ['{ "a": 1 }', 'Raw text · Bruno detects the format']
    ])('describes %s', (text, description) => {
      expect(describeImportText(text)).toEqual({ text: description });
    });

    it('warns that a ZIP URL is not supported', () => {
      expect(describeImportText('https://a.dev/a.zip')).toEqual({
        isWarning: true,
        text: 'Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.'
      });
    });
  });
});
