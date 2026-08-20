const path = require('node:path');

const { configureRequest } = require('../../../src/ipc/network/index');
const { startNtlmServer } = require('../../../../bruno-tests/src/ntlm');

const FIXTURES_PATH = path.join(__dirname, '..', 'fixtures');
const CUSTOM_CA_PATH = path.join(FIXTURES_PATH, 'ntlm-custom-ca.crt');

const credentials = { username: 'user', password: 'pass', domain: 'CORP', workstation: 'WS1' };

const startNtlmEndpoint = (options) => startNtlmServer({ ...options, password: credentials.password });

const buildRequest = ({ url = 'https://ntlm.example.com/api', ntlmConfig = null, ...overrides } = {}) => ({
  method: 'GET',
  url,
  headers: {},
  body: {},
  ...(ntlmConfig ? { ntlmConfig: { ...ntlmConfig } } : {}),
  ...overrides
});

const configureFor = (request) =>
  configureRequest('collection-uid', { globalEnvironmentVariables: {} }, request, {}, {}, {}, FIXTURES_PATH, null, {}, {});

const sendRequest = async ({ ntlmConfig = credentials, ...options } = {}) => {
  const request = buildRequest({ ...options, ntlmConfig });
  const axiosInstance = await configureFor(request);

  return axiosInstance(request);
};

module.exports = { credentials, startNtlmEndpoint, buildRequest, configureFor, sendRequest, CUSTOM_CA_PATH };
