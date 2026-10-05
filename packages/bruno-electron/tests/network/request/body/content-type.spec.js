const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const { describe, it, expect, beforeAll, beforeEach, afterAll } = require('@jest/globals');
const { isFormData } = require('@usebruno/common').utils;

// The app's settings stores write their files under userData while the network module loads.
const mockUserDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-userdata-'));

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => mockUserDataPath),
    getVersion: jest.fn(() => '1.0.0')
  }
}));
jest.mock('../../../../src/ipc/network/prepare-request', () => ({
  ...jest.requireActual('../../../../src/ipc/network/prepare-request'),
  prepareRequest: jest.fn()
}));
jest.mock('../../../../src/ipc/network/axios-instance', () => ({
  makeAxiosInstance: jest.fn()
}));
jest.mock('../../../../src/ipc/network/cert-utils', () => ({
  getCertsAndProxyConfig: jest.fn(async () => ({})),
  buildCertsAndProxyConfig: jest.fn(async () => ({}))
}));

const { ipcMain } = require('electron');
const { prepareRequest } = require('../../../../src/ipc/network/prepare-request');
const { makeAxiosInstance } = require('../../../../src/ipc/network/axios-instance');
const registerAllNetworkIpc = require('../../../../src/ipc/network/index');

const { makeAxiosInstance: makeRealAxiosInstance } = jest.requireActual('../../../../src/ipc/network/axios-instance');

const COLLECTION_PATH = path.join(os.tmpdir(), 'test-collection');
const COLLECTION = { uid: 'collection-1', pathname: COLLECTION_PATH };
const ITEM = { uid: 'item-1', pathname: path.join(COLLECTION_PATH, 'request.bru') };
const URL_ENCODED_FORM_FIELDS = 'name=John+Doe&role=admin';
const FORM_CONTENT_TYPES = [
  'application/x-www-form-urlencoded',
  'application/x-www-form-urlencoded; charset=utf-8',
  'Application/X-WWW-Form-Urlencoded',
  'multipart/form-data; boundary=custom',
  'Multipart/Form-Data'
];

const buildFormFields = () => [
  { name: 'name', value: 'John Doe', type: 'text', enabled: true },
  { name: 'role', value: 'admin', type: 'text', enabled: true }
];

const fakeWindow = { webContents: { send: jest.fn() } };

// Lines of the encoded body that open, separate and close its parts.
const getBoundaryDelimiters = (body) => body.split('\r\n').filter((line) => line.startsWith('--'));

describe('send-http-request: request body encoding by Content-Type', () => {
  let sendHttpRequestHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    registerAllNetworkIpc(fakeWindow);
    sendHttpRequestHandler = ipcMain.handle.mock.calls.find(([channel]) => channel === 'send-http-request')[1];
  });

  afterAll(() => {
    fs.rmSync(mockUserDataPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  const runRequest = ({ url, headers, data }) => {
    prepareRequest.mockResolvedValue({ method: 'POST', url, headers, data });

    return sendHttpRequestHandler({}, ITEM, COLLECTION, undefined, {});
  };

  // Runs the request through the IPC handler and returns the config handed to axios.
  const sendRequest = async ({ headers, data }) => {
    const axiosInstance = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
    makeAxiosInstance.mockReturnValue(axiosInstance);

    await runRequest({ url: 'http://example.com/api', headers, data });

    return axiosInstance.mock.calls[0][0];
  };

  it.each([
    'application/x-www-form-urlencoded',
    'application/x-www-form-urlencoded; charset=utf-8',
    'application/x-www-form-urlencoded ; charset=utf-8',
    'application/x-www-form-urlencoded; charset=utf-8; boundary=something',
    'Application/X-WWW-Form-Urlencoded; charset=utf-8'
  ])('url-encodes the form fields when Content-Type is "%s"', async (contentType) => {
    const sentRequest = await sendRequest({ headers: { 'content-type': contentType }, data: buildFormFields() });

    expect(sentRequest.data).toBe(URL_ENCODED_FORM_FIELDS);
  });

  it('sends a url-encoded Content-Type header with its parameters unchanged', async () => {
    const contentType = 'application/x-www-form-urlencoded; charset=utf-8';

    const sentRequest = await sendRequest({ headers: { 'content-type': contentType }, data: buildFormFields() });

    expect(sentRequest.headers['content-type']).toBe(contentType);
  });

  it('sends the body unchanged when there is no Content-Type header', async () => {
    const sentRequest = await sendRequest({ headers: {}, data: buildFormFields() });

    expect(sentRequest.data).toEqual(buildFormFields());
  });

  // prepareRequest sets Content-Type to false for body mode "none" so axios doesn't add one
  it('sends the body unchanged when Content-Type is false', async () => {
    const sentRequest = await sendRequest({ headers: { 'content-type': false }, data: undefined });

    expect(sentRequest.data).toBeUndefined();
  });

  it.each(FORM_CONTENT_TYPES)('sends a file body unchanged when Content-Type is "%s"', async (contentType) => {
    const fileBody = Buffer.from(URL_ENCODED_FORM_FIELDS);

    const sentRequest = await sendRequest({ headers: { 'content-type': contentType }, data: fileBody });

    expect(sentRequest.data).toBe(fileBody);
  });

  it.each(FORM_CONTENT_TYPES)('sends a streamed file body unchanged when Content-Type is "%s"', async (contentType) => {
    const fileStream = Readable.from([URL_ENCODED_FORM_FIELDS]);

    const sentRequest = await sendRequest({ headers: { 'content-type': contentType }, data: fileStream });

    expect(sentRequest.data).toBe(fileStream);
  });

  it('sends multipart form data with a generated boundary when Content-Type carries a charset', async () => {
    const sentRequest = await sendRequest({
      headers: { 'content-type': 'multipart/form-data; charset=utf-8' },
      data: buildFormFields()
    });

    expect(isFormData(sentRequest.data)).toBe(true);
    expect(sentRequest.headers['content-type']).toBe(
      `multipart/form-data; charset=utf-8; boundary=${sentRequest.data.getBoundary()}`
    );
  });

  it('sends a multipart Content-Type header with its boundary unchanged', async () => {
    const contentType = 'multipart/form-data; boundary=custom';

    const sentRequest = await sendRequest({ headers: { 'content-type': contentType }, data: buildFormFields() });

    expect(sentRequest.headers['content-type']).toBe(contentType);
  });

  it.each([
    ['multipart/form-data; boundary=custom', 'custom'],
    ['multipart/form-data; boundary="my custom boundary"', 'my custom boundary'],
    ['multipart/form-data; charset=utf-8; boundary=abc123', 'abc123']
  ])('delimits the multipart body with the boundary from Content-Type "%s"', async (contentType, boundary) => {
    const sentRequest = await sendRequest({ headers: { 'content-type': contentType }, data: buildFormFields() });

    expect(getBoundaryDelimiters(sentRequest.data.getBuffer().toString())).toEqual([`--${boundary}`, `--${boundary}`, `--${boundary}--`]);
  });

  describe('multipart body on method-preserving redirects', () => {
    const MULTIPART_BOUNDARY = 'custom';
    const MULTIPART_CONTENT_TYPE = `multipart/mixed; boundary=${MULTIPART_BOUNDARY}`;

    let server;
    let baseUrl;
    let redirectedRequest;

    // Answers /redirect/<status> with that redirect to /target, and records the request /target receives.
    beforeAll(async () => {
      server = http.createServer((req, res) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          const redirectMatch = req.url.match(/^\/redirect\/(\d+)$/);
          if (redirectMatch) {
            res.writeHead(Number(redirectMatch[1]), { location: '/target' });
            res.end();
            return;
          }

          redirectedRequest = { contentType: req.headers['content-type'], body: Buffer.concat(chunks).toString() };
          res.writeHead(200);
          res.end('ok');
        });
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    beforeEach(() => {
      redirectedRequest = undefined;
      makeAxiosInstance.mockImplementation(makeRealAxiosInstance);
    });

    const sendMultipartRequest = (redirectStatus) => runRequest({
      url: `${baseUrl}/redirect/${redirectStatus}`,
      headers: { 'content-type': MULTIPART_CONTENT_TYPE },
      data: buildFormFields()
    });

    it.each([307, 308])('sends the original Content-Type after a %i redirect', async (redirectStatus) => {
      await sendMultipartRequest(redirectStatus);

      expect(redirectedRequest.contentType).toBe(MULTIPART_CONTENT_TYPE);
    });

    it.each([307, 308])('delimits the body with the Content-Type boundary after a %i redirect', async (redirectStatus) => {
      await sendMultipartRequest(redirectStatus);

      expect(getBoundaryDelimiters(redirectedRequest.body)).toEqual([
        `--${MULTIPART_BOUNDARY}`,
        `--${MULTIPART_BOUNDARY}`,
        `--${MULTIPART_BOUNDARY}--`
      ]);
    });
  });
});
