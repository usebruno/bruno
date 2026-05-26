const { getCertsAndProxyConfig } = require('./network/cert-utils');
const { makeAxiosInstance } = require('./network/axios-instance');

const proxySwaggerFetch = async (req = {}) => {
  const { url, method, headers, body } = req || {};

  if (!url || typeof url !== 'string') {
    return {
      error: true,
      code: 'INVALID_REQUEST',
      message: 'Missing or invalid url'
    };
  }

  try {
    const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions }
      = await getCertsAndProxyConfig({
        collectionUid: null,
        collection: { promptVariables: {} },
        request: { url },
        envVars: {},
        runtimeVariables: {},
        processEnvVars: {},
        collectionPath: '',
        globalEnvironmentVariables: {}
      });

    const axiosInstance = makeAxiosInstance({
      proxyMode,
      proxyConfig,
      httpsAgentRequestFields,
      interpolationOptions
    });

    const response = await axiosInstance.request({
      url,
      method: method || 'GET',
      headers: headers || {},
      data: body,
      responseType: 'arraybuffer',
      validateStatus: () => true,
      maxRedirects: 5,
      timeout: 60000
    });

    const dataBuf = response.data instanceof Buffer
      ? response.data
      : Buffer.from(response.data || '');

    return {
      status: response.status,
      statusText: response.statusText || '',
      headers: response.headers || {},
      bodyBase64: dataBuf.toString('base64')
    };
  } catch (err) {
    return {
      error: true,
      code: err.code || 'UNKNOWN',
      message: err.message || String(err)
    };
  }
};

module.exports = { proxySwaggerFetch };
