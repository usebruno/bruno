const { processAuth } = require("../../../src/postman/postman-to-bruno");


describe('processAuth', () => {
  let requestObject;

  beforeEach(() => {
    requestObject = {
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        awsv4: null,
        apikey: null,
        oauth2: null,
        digest: null
      }
    };
  });

  it('should handle no auth', () => {
    processAuth(null, requestObject);
    expect(requestObject.auth.mode).toBe('none');
  });

  it('should handle noauth type', () => {
    processAuth({ type: 'noauth' }, requestObject);
    expect(requestObject.auth.mode).toBe('none');
  });

  it('should handle basic auth', () => {
    const auth = {
      type: 'basic',
      basic: [
        { key: 'username', value: 'testuser', type: 'string' },
        { key: 'password', value: 'testpass', type: 'string' }
      ]
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('basic');
    expect(requestObject.auth.basic).toEqual({
      username: 'testuser',
      password: 'testpass'
    });
  });

  it('should handle basic auth with missing values', () => {
    const auth = {
      type: 'basic',
      basic: {}
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('basic');
    expect(requestObject.auth.basic).toEqual({
      username: '',
      password: ''
    });
  });

  it('should handle basic auth with missing basic key', () => {
    const auth = {
      type: 'basic'
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('basic');
    expect(requestObject.auth.basic).toEqual({
      username: '',
      password: ''
    });
  });

  it('should handle bearer auth', () => {
    const auth = {
      type: 'bearer',
      bearer: {
        token: 'test-token'
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('bearer');
    expect(requestObject.auth.bearer).toEqual({
      token: 'test-token'
    });
  });

  it('should handle bearer auth with missing values', () => {
    const auth = {
      type: 'bearer',
      bearer: {}
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('bearer');
    expect(requestObject.auth.bearer).toEqual({
      token: ''
    });
  });

  it('should handle bearer auth with missing bearer key', () => {
    const auth = {
      type: 'bearer'
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('bearer');
    expect(requestObject.auth.bearer).toEqual({
      token: ''
    });
  });

  it('should handle awsv4 auth', () => {
    const auth = {
      type: 'awsv4',
      awsv4: {
        accessKey: 'test-access-key',
        secretKey: 'test-secret-key',
        sessionToken: 'test-session-token',
        service: 'test-service',
        region: 'test-region'
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('awsv4');
    expect(requestObject.auth.awsv4).toEqual({
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      sessionToken: 'test-session-token',
      service: 'test-service',
      region: 'test-region',
      profileName: ''
    });
  });

  it('should handle awsv4 auth with missing values', () => {
    const auth = {
      type: 'awsv4',
      awsv4: {}
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('awsv4');
    expect(requestObject.auth.awsv4).toEqual({
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
      service: '',
      region: '',
      profileName: ''
    });
  });

  it('should handle awsv4 auth with missing awsv4 key', () => {
    const auth = {
      type: 'awsv4'
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('awsv4');
    expect(requestObject.auth.awsv4).toEqual({
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
      service: '',
      region: '',
      profileName: ''
    });
  });

  it('should handle apikey auth', () => {
    const auth = {
      type: 'apikey',
      apikey: {
        key: 'test-key',
        value: 'test-value'
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('apikey');
    expect(requestObject.auth.apikey).toEqual({
      key: 'test-key',
      value: 'test-value',
      placement: 'header'
    });
  });

  it('should handle apikey auth with missing values', () => {
    const auth = {
      type: 'apikey',
      apikey: {}
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('apikey');
    expect(requestObject.auth.apikey).toEqual({
      key: '',
      value: '',
      placement: 'header'
    });
  });

  it('should handle apikey auth with missing apikey key', () => {
    const auth = {
      type: 'apikey'
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('apikey');
    expect(requestObject.auth.apikey).toEqual({
      key: '',
      value: '',
      placement: 'header'
    });
  });

  it('should handle digest auth', () => {
    const auth = {
      type: 'digest',
      digest: {
        username: 'testuser',
        password: 'testpass'
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('digest');
    expect(requestObject.auth.digest).toEqual({
      username: 'testuser',
      password: 'testpass'
    });
  });

  it('should handle digest auth with missing values', () => {
    const auth = {
      type: 'digest',
      digest: {}
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('digest');
    expect(requestObject.auth.digest).toEqual({
      username: '',
      password: ''
    });
  });

  it('should handle digest auth with missing digest key', () => {
    const auth = {
      type: 'digest'
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('digest');
    expect(requestObject.auth.digest).toEqual({
      username: '',
      password: ''
    });
  });

  it('should handle oauth2 auth with authorization_code grant type', () => {
    const auth = {
      type: 'oauth2',
      oauth2: {
        grant_type: 'authorization_code',
        authUrl: 'https://auth.example.com',
        redirect_uri: 'https://callback.example.com',
        accessTokenUrl: 'https://token.example.com',
        refreshTokenUrl: 'https://refresh.example.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        scope: 'test-scope',
        state: 'test-state',
        addTokenTo: 'header',
        client_authentication: 'body',
        authRequestParams: [
          {
            "key": "auth_var",
            "value": "auth_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "auth_var_disabled",
            "value": "auth_value",
            "enabled": false,
            "send_as": "request_url"
          }
        ],
        refreshRequestParams: [
          {
            "key": "refresh_body_var",
            "value": "refresh_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "refresh_body_var_disabled",
            "value": "refresh_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "refresh_url_var",
            "value": "refresh_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "refresh_url_var_disabled",
            "value": "refresh_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "refresh_header_var",
            "value": "refresh_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "refresh_header_var_disabled",
            "value": "refresh_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ],
        tokenRequestParams: [
          {
            "key": "token_body_var",
            "value": "token_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "token_body_var_disabled",
            "value": "token_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "token_url_var",
            "value": "token_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "token_url_var_disabled",
            "value": "token_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "token_header_var",
            "value": "token_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "token_header_var_disabled",
            "value": "token_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ]
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('oauth2');
    expect(requestObject.auth.oauth2).toEqual({
      grantType: 'authorization_code',
      authorizationUrl: 'https://auth.example.com',
      callbackUrl: 'https://callback.example.com',
      accessTokenUrl: 'https://token.example.com',
      refreshTokenUrl: 'https://refresh.example.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scope: 'test-scope',
      state: 'test-state',
      pkce: false,
      tokenPlacement: 'header',
      credentialsPlacement: 'body',
      additionalParameters: {
        authorization: [
          {
            "enabled": true,
            "name": "auth_var",
            "sendIn": "queryparams",
            "value": "auth_value",
          },
          {
            "enabled": false,
            "name": "auth_var_disabled",
            "sendIn": "queryparams",
            "value": "auth_value",
          },
        ],
        refresh: [
          {
            "enabled": true,
            "name": "refresh_body_var",
            "sendIn": "body",
            "value": "refresh_body_value",
          },
          {
            "enabled": false,
            "name": "refresh_body_var_disabled",
            "sendIn": "body",
            "value": "refresh_body_value",
          },
          {
            "enabled": true,
            "name": "refresh_url_var",
            "sendIn": "queryparams",
            "value": "refresh_url_value",
          },
          {
            "enabled": false,
            "name": "refresh_url_var_disabled",
            "sendIn": "queryparams",
            "value": "refresh_url_value",
          },
          {
            "enabled": true,
            "name": "refresh_header_var",
            "sendIn": "headers",
            "value": "refresh_header_value",
          },
          {
            "enabled": false,
            "name": "refresh_header_var_disabled",
            "sendIn": "headers",
            "value": "refresh_header_value",
          }
        ],
        token: [
          {
            "enabled": true,
            "name": "token_body_var",
            "sendIn": "body",
            "value": "token_body_value",
          },
          {
            "enabled": false,
            "name": "token_body_var_disabled",
            "sendIn": "body",
            "value": "token_body_value",
          },
          {
            "enabled": true,
            "name": "token_url_var",
            "sendIn": "queryparams",
            "value": "token_url_value",
          },
          {
            "enabled": false,
            "name": "token_url_var_disabled",
            "sendIn": "queryparams",
            "value": "token_url_value",
          },
          {
            "enabled": true,
            "name": "token_header_var",
            "sendIn": "headers",
            "value": "token_header_value",
          },
          {
            "enabled": false,
            "name": "token_header_var_disabled",
            "sendIn": "headers",
            "value": "token_header_value",
          },
        ],
      },
    });
  });

  it('should handle oauth2 auth with password_credentials grant type', () => {
    const auth = {
      type: 'oauth2',
      oauth2: {
        grant_type: 'password_credentials',
        accessTokenUrl: 'https://token.example.com',
        refreshTokenUrl: 'https://refresh.example.com',
        username: 'testuser',
        password: 'testpass',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        scope: 'test-scope',
        state: 'test-state',
        addTokenTo: 'header',
        client_authentication: 'body',
        authRequestParams: [
          {
            "key": "auth_var",
            "value": "auth_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "auth_var_disabled",
            "value": "auth_value",
            "enabled": false,
            "send_as": "request_url"
          }
        ],
        refreshRequestParams: [
          {
            "key": "refresh_body_var",
            "value": "refresh_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "refresh_body_var_disabled",
            "value": "refresh_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "refresh_url_var",
            "value": "refresh_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "refresh_url_var_disabled",
            "value": "refresh_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "refresh_header_var",
            "value": "refresh_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "refresh_header_var_disabled",
            "value": "refresh_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ],
        tokenRequestParams: [
          {
            "key": "token_body_var",
            "value": "token_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "token_body_var_disabled",
            "value": "token_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "token_url_var",
            "value": "token_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "token_url_var_disabled",
            "value": "token_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "token_header_var",
            "value": "token_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "token_header_var_disabled",
            "value": "token_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ]
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('oauth2');
    expect(requestObject.auth.oauth2).toEqual({
      grantType: 'password',
      accessTokenUrl: 'https://token.example.com',
      refreshTokenUrl: 'https://refresh.example.com',
      username: 'testuser',
      password: 'testpass',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scope: 'test-scope',
      state: 'test-state',
      tokenPlacement: 'header',
      credentialsPlacement: 'body',
      additionalParameters: {
        refresh: [
          {
            "enabled": true,
            "name": "refresh_body_var",
            "sendIn": "body",
            "value": "refresh_body_value",
          },
          {
            "enabled": false,
            "name": "refresh_body_var_disabled",
            "sendIn": "body",
            "value": "refresh_body_value",
          },
          {
            "enabled": true,
            "name": "refresh_url_var",
            "sendIn": "queryparams",
            "value": "refresh_url_value",
          },
          {
            "enabled": false,
            "name": "refresh_url_var_disabled",
            "sendIn": "queryparams",
            "value": "refresh_url_value",
          },
          {
            "enabled": true,
            "name": "refresh_header_var",
            "sendIn": "headers",
            "value": "refresh_header_value",
          },
          {
            "enabled": false,
            "name": "refresh_header_var_disabled",
            "sendIn": "headers",
            "value": "refresh_header_value",
          }
        ],
        token: [
          {
            "enabled": true,
            "name": "token_body_var",
            "sendIn": "body",
            "value": "token_body_value",
          },
          {
            "enabled": false,
            "name": "token_body_var_disabled",
            "sendIn": "body",
            "value": "token_body_value",
          },
          {
            "enabled": true,
            "name": "token_url_var",
            "sendIn": "queryparams",
            "value": "token_url_value",
          },
          {
            "enabled": false,
            "name": "token_url_var_disabled",
            "sendIn": "queryparams",
            "value": "token_url_value",
          },
          {
            "enabled": true,
            "name": "token_header_var",
            "sendIn": "headers",
            "value": "token_header_value",
          },
          {
            "enabled": false,
            "name": "token_header_var_disabled",
            "sendIn": "headers",
            "value": "token_header_value",
          },
        ],
      },

    });
  });

  it('should handle oauth2 auth with client_credentials grant type', () => {
    const auth = {
      type: 'oauth2',
      oauth2: {
        grant_type: 'client_credentials',
        accessTokenUrl: 'https://token.example.com',
        refreshTokenUrl: 'https://refresh.example.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        scope: 'test-scope',
        state: 'test-state',
        addTokenTo: 'header',
        client_authentication: 'body',
        authRequestParams: [
          {
            "key": "auth_var",
            "value": "auth_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "auth_var_disabled",
            "value": "auth_value",
            "enabled": false,
            "send_as": "request_url"
          }
        ],
        refreshRequestParams: [
          {
            "key": "refresh_body_var",
            "value": "refresh_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "refresh_body_var_disabled",
            "value": "refresh_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "refresh_url_var",
            "value": "refresh_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "refresh_url_var_disabled",
            "value": "refresh_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "refresh_header_var",
            "value": "refresh_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "refresh_header_var_disabled",
            "value": "refresh_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ],
        tokenRequestParams: [
          {
            "key": "token_body_var",
            "value": "token_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "token_body_var_disabled",
            "value": "token_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "token_url_var",
            "value": "token_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "token_url_var_disabled",
            "value": "token_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "token_header_var",
            "value": "token_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "token_header_var_disabled",
            "value": "token_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ]
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('oauth2');
    expect(requestObject.auth.oauth2).toEqual({
      grantType: 'client_credentials',
      accessTokenUrl: 'https://token.example.com',
      refreshTokenUrl: 'https://refresh.example.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scope: 'test-scope',
      state: 'test-state',
      tokenPlacement: 'header',
      credentialsPlacement: 'body',
      additionalParameters: {
        refresh: [
          {
            "enabled": true,
            "name": "refresh_body_var",
            "sendIn": "body",
            "value": "refresh_body_value",
          },
          {
            "enabled": false,
            "name": "refresh_body_var_disabled",
            "sendIn": "body",
            "value": "refresh_body_value",
          },
          {
            "enabled": true,
            "name": "refresh_url_var",
            "sendIn": "queryparams",
            "value": "refresh_url_value",
          },
          {
            "enabled": false,
            "name": "refresh_url_var_disabled",
            "sendIn": "queryparams",
            "value": "refresh_url_value",
          },
          {
            "enabled": true,
            "name": "refresh_header_var",
            "sendIn": "headers",
            "value": "refresh_header_value",
          },
          {
            "enabled": false,
            "name": "refresh_header_var_disabled",
            "sendIn": "headers",
            "value": "refresh_header_value",
          }
        ],
        token: [
          {
            "enabled": true,
            "name": "token_body_var",
            "sendIn": "body",
            "value": "token_body_value",
          },
          {
            "enabled": false,
            "name": "token_body_var_disabled",
            "sendIn": "body",
            "value": "token_body_value",
          },
          {
            "enabled": true,
            "name": "token_url_var",
            "sendIn": "queryparams",
            "value": "token_url_value",
          },
          {
            "enabled": false,
            "name": "token_url_var_disabled",
            "sendIn": "queryparams",
            "value": "token_url_value",
          },
          {
            "enabled": true,
            "name": "token_header_var",
            "sendIn": "headers",
            "value": "token_header_value",
          },
          {
            "enabled": false,
            "name": "token_header_var_disabled",
            "sendIn": "headers",
            "value": "token_header_value",
          },
        ],
      },
    });
  });

  it('should handle oauth2 auth with implicit grant type', () => {
    const auth = {
      type: 'oauth2',
      oauth2: {
        grant_type: 'implicit',
        authUrl: 'https://auth.example.com',
        redirect_uri: 'https://callback.example.com',
        clientId: 'test-client-id',
        scope: 'test-scope',
        state: 'test-state',
        addTokenTo: 'header',
        client_authentication: 'body',
        authRequestParams: [
          {
            "key": "auth_var",
            "value": "auth_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "auth_var_disabled",
            "value": "auth_value",
            "enabled": false,
            "send_as": "request_url"
          }
        ],
        refreshRequestParams: [
          {
            "key": "refresh_body_var",
            "value": "refresh_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "refresh_body_var_disabled",
            "value": "refresh_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "refresh_url_var",
            "value": "refresh_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "refresh_url_var_disabled",
            "value": "refresh_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "refresh_header_var",
            "value": "refresh_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "refresh_header_var_disabled",
            "value": "refresh_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ],
        tokenRequestParams: [
          {
            "key": "token_body_var",
            "value": "token_body_value",
            "enabled": true,
            "send_as": "request_body"
          },
          {
            "key": "token_body_var_disabled",
            "value": "token_body_value",
            "enabled": false,
            "send_as": "request_body"
          },
          {
            "key": "token_url_var",
            "value": "token_url_value",
            "enabled": true,
            "send_as": "request_url"
          },
          {
            "key": "token_url_var_disabled",
            "value": "token_url_value",
            "enabled": false,
            "send_as": "request_url"
          },
          {
            "key": "token_header_var",
            "value": "token_header_value",
            "enabled": true,
            "send_as": "request_header"
          },
          {
            "key": "token_header_var_disabled",
            "value": "token_header_value",
            "enabled": false,
            "send_as": "request_header"
          }
        ]
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('oauth2');
    expect(requestObject.auth.oauth2).toEqual({
      grantType: 'implicit',
      authorizationUrl: 'https://auth.example.com',
      callbackUrl: 'https://callback.example.com',
      clientId: 'test-client-id',
      scope: 'test-scope',
      state: 'test-state',
      tokenPlacement: 'header',
      credentialsPlacement: 'body',
      additionalParameters: {
        authorization: [
          {
            "enabled": true,
            "name": "auth_var",
            "sendIn": "queryparams",
            "value": "auth_value",
          },
          {
            "enabled": false,
            "name": "auth_var_disabled",
            "sendIn": "queryparams",
            "value": "auth_value",
          },
        ]
      },
    });
  });

  it('should handle oauth2 auth with missing values', () => {
    const auth = {
      type: 'oauth2',
      oauth2: {}
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.oauth2).toBeNull();
  });

  it('should handle oauth2 auth with missing oauth2 key', () => {
    const auth = {
      type: 'oauth2'
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.oauth2).toBeNull();
  });

  it('should handle oauth2 auth with authorization_code_with_pkce grant type', () => {
    const auth = {
      type: 'oauth2',
      oauth2: {
        grant_type: 'authorization_code_with_pkce',
        authUrl: 'https://auth.example.com',
        redirect_uri: 'https://callback.example.com',
        accessTokenUrl: 'https://token.example.com',
        refreshTokenUrl: 'https://refresh.example.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        scope: 'test-scope',
        state: 'test-state',
        addTokenTo: 'header',
        client_authentication: 'body'
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('oauth2');
    expect(requestObject.auth.oauth2).toEqual({
      grantType: 'authorization_code',
      authorizationUrl: 'https://auth.example.com',
      callbackUrl: 'https://callback.example.com',
      accessTokenUrl: 'https://token.example.com',
      refreshTokenUrl: 'https://refresh.example.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scope: 'test-scope',
      state: 'test-state',
      pkce: true,
      tokenPlacement: 'header',
      credentialsPlacement: 'body'
    });
  });

  it('should handle auth object with undefined type', () => {
    const auth = {};
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.basic).toBe(null);
    expect(requestObject.auth.bearer).toBe(null);
    expect(requestObject.auth.awsv4).toBe(null);
    expect(requestObject.auth.apikey).toBe(null);
    expect(requestObject.auth.oauth2).toBe(null);
    expect(requestObject.auth.digest).toBe(null);
  });

  it('should handle type as null and auth as null', () => {
    const auth = {
      type: null,
      auth: null
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.basic).toBe(null);
    expect(requestObject.auth.bearer).toBe(null);
    expect(requestObject.auth.awsv4).toBe(null);
    expect(requestObject.auth.apikey).toBe(null);
    expect(requestObject.auth.oauth2).toBe(null);
    expect(requestObject.auth.digest).toBe(null);
  });

  it('should handle auth object with undefined type, but basic auth', () => {
    const auth = {
      basic: [
        { key: 'username', value: 'testuser', type: 'string' },
        { key: 'password', value: 'testpass', type: 'string' }
      ]
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.basic).toBe(null);
    expect(requestObject.auth.bearer).toBe(null);
    expect(requestObject.auth.awsv4).toBe(null);
    expect(requestObject.auth.apikey).toBe(null);
    expect(requestObject.auth.oauth2).toBe(null);
    expect(requestObject.auth.digest).toBe(null);
  });

  it('should handle auth object with null type', () => {
    const auth = {
      type: null,
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.basic).toBe(null);
    expect(requestObject.auth.bearer).toBe(null);
    expect(requestObject.auth.awsv4).toBe(null);
    expect(requestObject.auth.apikey).toBe(null);
    expect(requestObject.auth.oauth2).toBe(null);
    expect(requestObject.auth.digest).toBe(null);
  });

  it('should handle auth object with empty string type', () => {
    const auth = {
      type: null,
      basic: {
        username: 'testuser',
        password: 'testpass'
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.basic).toBe(null);
    expect(requestObject.auth.bearer).toBe(null);
    expect(requestObject.auth.awsv4).toBe(null);
    expect(requestObject.auth.apikey).toBe(null);
    expect(requestObject.auth.oauth2).toBe(null);
    expect(requestObject.auth.digest).toBe(null);
  });

  it('should handle auth object with boolean type value', () => {
    const auth = {
      type: "unknown_auth_type",
      unknown_auth_type: {
        accessKey: 'test-access-key',
        secretKey: 'test-secret-key'
      }
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('none');
    expect(requestObject.auth.basic).toBe(null);
    expect(requestObject.auth.bearer).toBe(null);
    expect(requestObject.auth.awsv4).toBe(null);
    expect(requestObject.auth.apikey).toBe(null);
    expect(requestObject.auth.oauth2).toBe(null);
    expect(requestObject.auth.digest).toBe(null);
  });
});
