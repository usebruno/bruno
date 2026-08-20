const axios = require('axios');
const { AxiosError } = axios;
const { messageType } = require('../../../../bruno-tests/src/ntlm');

const { configureFor } = require('./ntlm-request');

const stubAdapter = (responses, calls) => async (config) => {
  calls.push(config);
  const reply = responses[calls.length - 1];
  const response = {
    data: reply.data ?? {},
    status: reply.status,
    statusText: reply.statusText ?? 'OK',
    headers: reply.headers ?? {},
    config
  };

  if (reply.status >= 200 && reply.status < 300) {
    return response;
  }

  throw new AxiosError(`Request failed with status code ${reply.status}`, null, config, null, response);
};

const sendThroughStubAdapter = async ({ request, responses }) => {
  const calls = [];
  const axiosInstance = await configureFor(request);
  const response = await axiosInstance({ ...request, adapter: stubAdapter(responses, calls) });

  return { response, calls };
};

// A stub in the request's adapter would shadow the ntlm adapter, so this one sits beneath it.
const negotiateThroughStubAdapter = async ({ request, responses }) => {
  const calls = [];
  const legTypesAsSent = [];
  const resolveAdapter = axios.getAdapter;
  const stub = stubAdapter(responses, calls);

  jest.spyOn(axios, 'getAdapter').mockImplementation((name) => {
    if (name !== 'http') {
      return resolveAdapter(name);
    }
    return (config) => {
      legTypesAsSent.push(messageType(config.headers?.Authorization ?? config.headers?.authorization));
      return stub(config);
    };
  });

  try {
    const axiosInstance = await configureFor(request);
    const response = await axiosInstance(request);

    return { response, calls, legTypesAsSent };
  } finally {
    axios.getAdapter.mockRestore();
  }
};

module.exports = { sendThroughStubAdapter, negotiateThroughStubAdapter };
