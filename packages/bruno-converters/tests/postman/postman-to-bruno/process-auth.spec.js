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
      pkce: false,
      tokenPlacement: 'header',
      credentialsPlacement: 'body'
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
        client_authentication: 'body'
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
      credentialsPlacement: 'body'
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
        client_authentication: 'body'
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
      credentialsPlacement: 'body'
    });
  });

  it('should handle oauth2 auth with missing values', () => {
    const auth = {
      type: 'oauth2',
      oauth2: {}
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('oauth2');
    expect(requestObject.auth.oauth2).toEqual({
      grantType: 'authorization_code',
      authorizationUrl: '',
      callbackUrl: '',
      accessTokenUrl: '',
      refreshTokenUrl: '',
      clientId: '',
      clientSecret: '',
      scope: '',
      state: '',
      pkce: false,
      tokenPlacement: 'url',
      credentialsPlacement: 'basic_auth_header'
    });
  });

  it('should handle oauth2 auth with missing oauth2 key', () => {
    const auth = {
      type: 'oauth2'
    };
    processAuth(auth, requestObject);
    expect(requestObject.auth.mode).toBe('oauth2');
    expect(requestObject.auth.oauth2).toEqual({
      grantType: 'authorization_code',
      authorizationUrl: '',
      callbackUrl: '',
      accessTokenUrl: '',
      refreshTokenUrl: '',
      clientId: '',
      clientSecret: '',
      scope: '',
      state: '',
      pkce: false,
      tokenPlacement: 'url',
      credentialsPlacement: 'basic_auth_header'
    });
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
});
