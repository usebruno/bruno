const { createHash } = require('node:crypto');
const { fromIni } = require('@aws-sdk/credential-providers');
const { aws4Interceptor } = require('aws4-axios');

function isStrPresent(str) {
  return str && str !== '' && str !== 'undefined';
}

function shouldAddContentSha(awsv4) {
  return String(awsv4.service || '').toLowerCase() === 'aoss';
}

function getTransformer(config) {
  const { transformRequest } = config;
  if (typeof transformRequest === 'function') {
    return transformRequest;
  }

  if (Array.isArray(transformRequest) && transformRequest.length) {
    return transformRequest[0];
  }
}

function setHeader(headers, name, value) {
  if (headers && typeof headers.set === 'function') {
    headers.set(name, value);
    return;
  }

  headers[name] = value;
}

function addContentShaHeader(config) {
  config.headers = config.headers || {};

  const transformer = getTransformer(config);
  const data = transformer ? transformer.call(config, config.data, config.headers) : config.data;
  const hash = createHash('sha256').update(data ?? '', 'utf8').digest('hex');

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
