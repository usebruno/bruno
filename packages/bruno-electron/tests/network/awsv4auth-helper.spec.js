const axios = require('axios');
const { addAwsV4Interceptor } = require('../../src/ipc/network/awsv4auth-helper');

const awsV4Config = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  service: 'aoss',
  region: 'us-east-1'
};

function createAxiosInstance() {
  return {
    interceptors: {
      request: {
        use: jest.fn()
      }
    }
  };
}

function getHeader(headers, name) {
  if (typeof headers.get === 'function') {
    return headers.get(name);
  }

  const key = Object.keys(headers).find((headerName) => headerName.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

describe('addAwsV4Interceptor', () => {
  it('adds payload hash signing for OpenSearch Serverless requests', async () => {
    const axiosInstance = createAxiosInstance();

    addAwsV4Interceptor(axiosInstance, {
      awsv4config: awsV4Config
    });

    const interceptor = axiosInstance.interceptors.request.use.mock.calls[0][0];
    const signedRequest = await interceptor({
      method: 'put',
      url: 'https://search-example.us-east-1.aoss.amazonaws.com/index-name/_doc/1',
      transformRequest: axios.defaults.transformRequest,
      headers: new axios.AxiosHeaders({
        'Content-Type': 'application/json'
      }),
      data: JSON.stringify({ title: 'Bruno' })
    });

    expect(getHeader(signedRequest.headers, 'x-amz-content-sha256')).toMatch(/^[a-f0-9]{64}$/);
    expect(getHeader(signedRequest.headers, 'authorization')).toContain('x-amz-content-sha256');
  });
});
