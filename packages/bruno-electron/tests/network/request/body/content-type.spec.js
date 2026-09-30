const { describe, it, expect, beforeEach } = require('@jest/globals');
const { isFormData } = require('@usebruno/common').utils;

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  app: {
    on: jest.fn(),
    getPath: jest.fn(() => require('node:os').tmpdir()),
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

const COLLECTION = { uid: 'collection-1', pathname: '/test-collection' };
const ITEM = { uid: 'item-1', pathname: '/test-collection/request.bru' };
const URL_ENCODED_FORM_FIELDS = 'name=John+Doe&role=admin';

const buildFormFields = () => [
  { name: 'name', value: 'John Doe', type: 'text', enabled: true },
  { name: 'role', value: 'admin', type: 'text', enabled: true }
];

const fakeWindow = { webContents: { send: jest.fn() } };

// Lines of the encoded body that open, separate and close its parts.
const getBoundaryDelimiters = (form) => form.getBuffer().toString().split('\r\n').filter((line) => line.startsWith('--'));

describe('send-http-request: request body encoding by Content-Type', () => {
  let sendHttpRequestHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    registerAllNetworkIpc(fakeWindow);
    sendHttpRequestHandler = ipcMain.handle.mock.calls.find(([channel]) => channel === 'send-http-request')[1];
  });

  // Runs the request through the IPC handler and returns the config handed to axios.
  const sendRequest = async ({ headers, data }) => {
    prepareRequest.mockResolvedValue({ method: 'POST', url: 'http://example.com/api', headers, data });
    const axiosInstance = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
    makeAxiosInstance.mockReturnValue(axiosInstance);

    await sendHttpRequestHandler({}, ITEM, COLLECTION, undefined, {});

    return axiosInstance.mock.calls[0][0];
  };

  it.each([
    'application/x-www-form-urlencoded',
    'application/x-www-form-urlencoded; charset=utf-8',
    'application/x-www-form-urlencoded ; charset=utf-8',
    'application/x-www-form-urlencoded; charset=utf-8; boundary=something'
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

    expect(getBoundaryDelimiters(sentRequest.data)).toEqual([`--${boundary}`, `--${boundary}`, `--${boundary}--`]);
  });
});
