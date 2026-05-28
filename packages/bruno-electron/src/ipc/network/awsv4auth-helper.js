const { fromIni } = require('@aws-sdk/credential-providers');
const { aws4Interceptor } = require('aws4-axios');

function isStrPresent(str) {
  return str && str !== '' && str !== 'undefined';
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

  axiosInstance.interceptors.request.use(interceptor);
}

module.exports = {
  addAwsV4Interceptor,
  resolveAwsV4Credentials
};
