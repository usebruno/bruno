const inputsConfig = [
  {
    key: 'consumerKey',
    label: 'AUTHORIZATION.OAUTH1.CONSUMER_KEY_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'consumerSecret',
    label: 'AUTHORIZATION.OAUTH1.CONSUMER_SECRET_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'requestTokenUrl',
    label: 'AUTHORIZATION.OAUTH1.REQUEST_TOKEN_URL_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'accessTokenUrl',
    label: 'AUTHORIZATION.OAUTH1.ACCESS_TOKEN_URL_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'authorizeUrl',
    label: 'AUTHORIZATION.OAUTH1.AUTHORIZE_URL_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'callbackUrl',
    label: 'AUTHORIZATION.OAUTH1.CALLBACK_TOKEN_URL_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'verifier',
    label: 'AUTHORIZATION.OAUTH1.OAUTH_VERIFIER_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'accessToken',
    label: 'AUTHORIZATION.OAUTH1.ACCESS_TOKEN_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'accessTokenSecret',
    label: 'AUTHORIZATION.OAUTH1.ACCESS_TOKEN_SECRET_FIELD',
    type: 'SingleLineEditor'
  },
  {
    key: 'rsaPrivateKey',
    label: 'AUTHORIZATION.OAUTH1.RSA_PRIVATE_KEY_FIELD',
    type: 'FilePickerEditor'
  },
  {
    key: 'signatureMethod',
    label: 'AUTHORIZATION.OAUTH1.SIGNATURE_METHOD_FIELD',
    type: 'Dropdown',
    options: ['HMAC-SHA1', 'HMAC-SHA256', 'HMAC-SHA512', 'RSA-SHA1', 'RSA-SHA256', 'RSA-SHA512', 'PLAINTEXT']
  },
  {
    key: 'parameterTransmissionMethod',
    label: 'AUTHORIZATION.OAUTH1.PARAM_TRANSMISSION_METHOD_FIELD',
    type: 'Dropdown',
    options: [
      {
        key: 'authorization_header',
        label: 'AUTHORIZATION.OAUTH1.PARAM_TRANSMISSION_METHOD.AUTHORIZATION_HEADER'
      },
      {
        key: 'request_body',
        label: 'AUTHORIZATION.OAUTH1.PARAM_TRANSMISSION_METHOD.REQUEST_BODY'
      },
      {
        key: 'query_param',
        label: 'AUTHORIZATION.OAUTH1.PARAM_TRANSMISSION_METHOD.QUERY_PARAM'
      }
    ]
  }
];

export { inputsConfig };
