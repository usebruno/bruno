const sensitiveFields = [
  'request.auth.oauth2.clientSecret',
  'request.auth.basic.password',
  'request.auth.digest.password',
  'request.auth.wsse.password',
  'request.auth.ntlm.password',
  'request.auth.awsv4.secretAccessKey',
  'request.auth.bearer.token',
  'request.auth.akamaiEdgegrid.accessToken',
  'request.auth.akamaiEdgegrid.clientToken',
  'request.auth.akamaiEdgegrid.clientSecret'
];

export { sensitiveFields };
