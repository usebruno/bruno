const { fromIni } = require('@aws-sdk/credential-providers');
const { aws4Interceptor } = require('aws4-axios');

function isStrPresent(str) {
  return str && str !== '' && str !== 'undefined';
}

function addAwsV4Interceptor(axiosInstance, request) {
  if (!request.awsv4config) {
    console.warn('No Auth Config found!');
    return;
  }

  const awsv4 = request.awsv4config;
  if (!isStrPresent(awsv4.profileName) && (!isStrPresent(awsv4.accessKeyId) || !isStrPresent(awsv4.secretAccessKey))) {
    console.warn('Required Auth Fields are not present');
    return;
  }

  let credentials = {
    accessKeyId: awsv4.accessKeyId,
    secretAccessKey: awsv4.secretAccessKey,
    sessionToken: awsv4.sessionToken
  };

  if (isStrPresent(awsv4.profileName)) {
    try {
      credentials = fromIni({
        profile: awsv4.profileName
      });
    } catch {
      console.error('Failed to fetch credentials from AWS profile.');
    }
  }

  const interceptor = aws4Interceptor({
    options: {
      region: awsv4.region,
      service: awsv4.service
    },
    credentials
  });
  axiosInstance.interceptors.request.use(interceptor);
  console.log('Added AWS V4 interceptor to axios.');
}

module.exports = {
  addAwsV4Interceptor
};
