const { createHash } = require('node:crypto');
const { fromIni } = require('@aws-sdk/credential-providers');
const { aws4Interceptor } = require('aws4-axios');

function isStrPresent(str) {
  return str && str !== '' && str !== 'undefined';
}

function shouldAddContentSha(awsv4) {
  return String(awsv4.service || '').toLowerCase() === 'aoss';
}

function getTransformers(config) {
  const { transformRequest } = config;
  if (typeof transformRequest === 'function') {
    return [transformRequest];
  }

  if (Array.isArray(transformRequest)) {
    return transformRequest.filter((transformer) => typeof transformer === 'function');
  }

  return [];
}

function getHeader(headers, name) {
  if (headers && typeof headers.get === 'function') {
    return headers.get(name);
  }

  const key = Object.keys(headers || {}).find((headerName) => headerName.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function setHeader(headers, name, value) {
  if (headers && typeof headers.set === 'function') {
    headers.set(name, value);
    return;
  }

  headers[name] = value;
}

function getHashPayload(data) {
  if (data == null) {
    return '';
  }

  if (typeof data === 'string' || Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
}

function applyTransformers(config) {
  return getTransformers(config).reduce((data, transformer) => {
    return transformer.call(config, data, config.headers);
  }, config.data);
}

function addContentShaHeader(config) {
  config.headers = config.headers || {};

  if (getHeader(config.headers, 'X-Amz-Content-Sha256') != null) {
    return;
  }

  const payload = getHashPayload(applyTransformers(config));
  if (payload === undefined) {
    return;
  }

  const hash = createHash('sha256').update(payload).digest('hex');

  setHeader(config.headers, 'X-Amz-Content-Sha256', hash);
}

function withContentShaHeader(interceptor) {
  return async (config) => {
    addContentShaHeader(config);
    return interceptor(config);
  };
}

async function resolveAwsV4Credentials(request) {
  const awsv4 = request.awsv4config;
  if (isStrPresent(awsv4.profileName)) {
    try {
      const credentialsProvider = fromIni({
        profile: awsv4.profileName,
        ignoreCache: true
      });
      const credentials = await credentialsProvider();
      awsv4.accessKeyId = credentials.accessKeyId;
      awsv4.secretAccessKey = credentials.secretAccessKey;
      awsv4.sessionToken = credentials.sessionToken;
    } catch {
      console.error('Failed to fetch credentials from AWS profile.');
    }
  }
  return awsv4;
}

function addAwsV4Interceptor(axiosInstance, request) {
  if (!request.awsv4config) {
    console.warn('No Auth Config found!');
    return;
  }

  const awsv4 = request.awsv4config;
  if (!isStrPresent(awsv4.accessKeyId) || !isStrPresent(awsv4.secretAccessKey)) {
    console.warn('Required Auth Fields are not present');
    return;
  }

  const interceptor = aws4Interceptor({
    options: {
      region: awsv4.region,
      service: awsv4.service
    },
    credentials: {
      accessKeyId: awsv4.accessKeyId,
      secretAccessKey: awsv4.secretAccessKey,
      sessionToken: awsv4.sessionToken
    }
  });

  axiosInstance.interceptors.request.use(shouldAddContentSha(awsv4) ? withContentShaHeader(interceptor) : interceptor);
}

module.exports = {
  addAwsV4Interceptor,
  resolveAwsV4Credentials
};
