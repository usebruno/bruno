const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const { describe, it, expect, beforeEach } = require('@jest/globals');
const { isFormData } = require('@usebruno/common').utils;

jest.mock('../../../../src/runner/prepare-request', () => jest.fn());
jest.mock('../../../../src/utils/axios-instance', () => ({
  makeAxiosInstance: jest.fn()
}));

const prepareRequest = require('../../../../src/runner/prepare-request');
const { makeAxiosInstance } = require('../../../../src/utils/axios-instance');
const { runSingleRequest } = require('../../../../src/runner/run-single-request');

const COLLECTION_PATH = path.join(os.tmpdir(), 'test-collection');
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

// Lines of the encoded body that open, separate and close its parts.
const getBoundaryDelimiters = (form) => form.getBuffer().toString().split('\r\n').filter((line) => line.startsWith('--'));

// Runs the request through runSingleRequest and returns the config handed to axios.
const sendRequest = async ({ headers, data }) => {
  prepareRequest.mockResolvedValue({ method: 'POST', url: 'http://example.com/api', headers, data });
  const axiosInstance = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
  makeAxiosInstance.mockReturnValue(axiosInstance);

  await runSingleRequest(
    { pathname: path.join(COLLECTION_PATH, 'request.bru') }, // item
    COLLECTION_PATH, // collectionPath
    {}, // runtimeVariables
    {}, // envVariables
    {}, // processEnvVars
    {}, // brunoConfig
    {}, // collectionRoot
    'quickjs', // runtime
    { items: [], pathname: COLLECTION_PATH }, // collection
    jest.fn() // runSingleRequestByPathname
  );

  return axiosInstance.mock.calls[0][0];
};

describe('runSingleRequest: request body encoding by Content-Type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    expect(getBoundaryDelimiters(sentRequest.data)).toEqual([`--${boundary}`, `--${boundary}`, `--${boundary}--`]);
  });
});
