const path = require('node:path');

const { configureFor, FIXTURES_PATH } = require('./ntlm-request');

const CUSTOM_CA_PATH = path.join(FIXTURES_PATH, 'ntlm-custom-ca.crt');

const stubTransport = (responses, calls) => (config) => {
  calls.push(config);
  const reply = responses[Math.min(calls.length - 1, responses.length - 1)];
  const response = {
    data: reply.data ?? {},
    status: reply.status,
    statusText: reply.statusText ?? 'OK',
    headers: reply.headers ?? {},
    config
  };

  if (reply.status >= 200 && reply.status < 300) {
    return Promise.resolve(response);
  }

  const error = new Error(`Request failed with status code ${reply.status}`);
  error.config = config;
  error.response = response;
  error.isAxiosError = true;

  return Promise.reject(error);
};

const sendThroughStubTransport = async ({ request, responses }) => {
  const calls = [];
  const axiosInstance = await configureFor(request);
  const response = await axiosInstance({ ...request, adapter: stubTransport(responses, calls) });

  return { response, calls };
};

const okResponse = { status: 200 };

const redirectResponse = (location) => ({ status: 302, statusText: 'Found', headers: { location } });

module.exports = { sendThroughStubTransport, okResponse, redirectResponse, CUSTOM_CA_PATH };
