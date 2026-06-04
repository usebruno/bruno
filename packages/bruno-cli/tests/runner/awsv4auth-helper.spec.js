const { createHash } = require('node:crypto');
const axios = require('axios');
const { addAwsV4Interceptor } = require('../../src/runner/awsv4auth-helper');

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

function sha256(payload) {
  return createHash('sha256').update(payload).digest('hex');
}

async function signRequest(awsv4config, config = {}) {
  const axiosInstance = createAxiosInstance();

  addAwsV4Interceptor(axiosInstance, {
    awsv4config
  });

  const interceptor = axiosInstance.interceptors.request.use.mock.calls[0][0];

  return interceptor({
    method: 'put',
    url: 'https://search-example.us-east-1.aoss.amazonaws.com/index-name/_doc/1',
    transformRequest: axios.defaults.transformRequest,
    headers: new axios.AxiosHeaders({
      'Content-Type': 'application/json'
    }),
    data: JSON.stringify({ title: 'Bruno' }),
    ...config
  });
}

describe('addAwsV4Interceptor', () => {
  it('adds payload hash signing for OpenSearch Serverless requests', async () => {
    const signedRequest = await signRequest(awsV4Config);

    expect(getHeader(signedRequest.headers, 'x-amz-content-sha256')).toBe(sha256(JSON.stringify({ title: 'Bruno' })));
    expect(getHeader(signedRequest.headers, 'authorization')).toContain('x-amz-content-sha256');
  });

  it('does not add payload hash signing for other AWS services', async () => {
    const signedRequest = await signRequest({
      ...awsV4Config,
      service: 'es'
    });

    expect(getHeader(signedRequest.headers, 'x-amz-content-sha256')).toBeUndefined();
    expect(getHeader(signedRequest.headers, 'authorization')).not.toContain('x-amz-content-sha256');
  });

  it('hashes the payload after applying the full transform chain', async () => {
    const signedRequest = await signRequest(awsV4Config, {
      data: 'Bruno',
      transformRequest: [
        (data) => `${data}-first`,
        (data) => `${data}-second`
      ]
    });

    expect(getHeader(signedRequest.headers, 'x-amz-content-sha256')).toBe(sha256('Bruno-first-second'));
  });

  it('preserves an existing payload hash header', async () => {
    const signedRequest = await signRequest(awsV4Config, {
      headers: new axios.AxiosHeaders({
        'Content-Type': 'application/json',
        'X-Amz-Content-Sha256': 'precomputed-content-hash'
      })
    });

    expect(getHeader(signedRequest.headers, 'x-amz-content-sha256')).toBe('precomputed-content-hash');
    expect(getHeader(signedRequest.headers, 'authorization')).toContain('x-amz-content-sha256');
  });
});
