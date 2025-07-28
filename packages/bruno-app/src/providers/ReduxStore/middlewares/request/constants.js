const sensitiveFields = [
  'request.auth.oauth2.clientSecret',
  'request.auth.basic.password',
  'request.auth.digest.password',
  'request.auth.wsse.password',
  'request.auth.ntlm.password',
  'request.auth.awsv4.secretAccessKey',
  'request.auth.bearer.token'
];

export { sensitiveFields };
