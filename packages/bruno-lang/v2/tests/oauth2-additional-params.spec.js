const bruToJson = require('../src/bruToJson');
const collectionBruToJson = require('../src/collectionBruToJson');

describe('OAuth2 Additional Parameters - request level', () => {
  it('should parse all oauth2 additional parameters config types together', () => {
    const input = `
meta {
  name: OAuth2 Additional Params Test
  type: http
}

get {
  url: https://api.usebruno.com/protected
}

auth:oauth2 {
  grant_type: authorization_code
  client_id: bruno-client-id
  client_secret: bruno-client-secret
  authorization_url: https://auth.usebruno.com/oauth/authorize
  access_token_url: https://auth.usebruno.com/oauth/token
}

auth:oauth2:authorization_headers {
  auth-header: auth-header-value
  ~disabled-auth-header: disabled-auth-header-value
}

auth:oauth2:authorization_queryparams {
  auth-query-param: auth-query-param-value
  ~disabled-auth-query-param: disabled-auth-query-param-value
}

auth:oauth2:token_headers {
  token-header: token-header-value
  ~disabled-token-header: disabled-token-header-value
}

auth:oauth2:token_queryparams {
  token-query-param: token-query-param-value
  ~disabled-token-query-param: disabled-token-query-param-value
}

auth:oauth2:token_bodyvalues {
  token-body: token-body-value
  ~disabled-token-body: disabled-token-body-value
}

auth:oauth2:refresh_headers {
  refresh-header: refresh-header-value
  ~disabled-refresh-header: disabled-refresh-header-value
}

auth:oauth2:refresh_queryparams {
  refresh-query-param: refresh-query-param-value
  ~disabled-refresh-query-param: disabled-refresh-query-param-value
}

auth:oauth2:refresh_bodyvalues {
  refresh-body: refresh-body-value
  ~disabled-refresh-body: disabled-refresh-body-value
}
    `.trim();

    const result = bruToJson(input);
    
    // Verify all config types are present
    expect(result).toHaveProperty('oauth2_additional_parameters_authorization_headers');
    expect(result).toHaveProperty('oauth2_additional_parameters_authorization_queryparams');
    expect(result).toHaveProperty('oauth2_additional_parameters_token_headers');
    expect(result).toHaveProperty('oauth2_additional_parameters_token_queryparams');
    expect(result).toHaveProperty('oauth2_additional_parameters_token_bodyvalues');
    expect(result).toHaveProperty('oauth2_additional_parameters_refresh_headers');
    expect(result).toHaveProperty('oauth2_additional_parameters_refresh_queryparams');
    expect(result).toHaveProperty('oauth2_additional_parameters_refresh_bodyvalues');

    // Verify each has exactly one parameter
    expect(result.oauth2_additional_parameters_authorization_headers).toHaveLength(2);
    expect(result.oauth2_additional_parameters_authorization_queryparams).toHaveLength(2);
    expect(result.oauth2_additional_parameters_token_headers).toHaveLength(2);
    expect(result.oauth2_additional_parameters_token_queryparams).toHaveLength(2);
    expect(result.oauth2_additional_parameters_token_bodyvalues).toHaveLength(2);
    expect(result.oauth2_additional_parameters_refresh_headers).toHaveLength(2);
    expect(result.oauth2_additional_parameters_refresh_queryparams).toHaveLength(2);
    expect(result.oauth2_additional_parameters_refresh_bodyvalues).toHaveLength(2);

    // Verify parameter values
    expect(result.oauth2_additional_parameters_authorization_headers).toEqual([{
      name: 'auth-header',
      value: 'auth-header-value',
      enabled: true
    }, {
      name: 'disabled-auth-header',
      value: 'disabled-auth-header-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_authorization_queryparams).toEqual([{
      name: 'auth-query-param',
      value: 'auth-query-param-value',
      enabled: true
    }, {
      name: 'disabled-auth-query-param',
      value: 'disabled-auth-query-param-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_token_headers).toEqual([{
      name: 'token-header',
      value: 'token-header-value',
      enabled: true
    }, {
      name: 'disabled-token-header',
      value: 'disabled-token-header-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_token_queryparams).toEqual([{
      name: 'token-query-param',
      value: 'token-query-param-value',
      enabled: true
    }, {
      name: 'disabled-token-query-param',
      value: 'disabled-token-query-param-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_token_bodyvalues).toEqual([{
      name: 'token-body',
      value: 'token-body-value',
      enabled: true
    }, {
      name: 'disabled-token-body',
      value: 'disabled-token-body-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_refresh_headers).toEqual([{
      name: 'refresh-header',
      value: 'refresh-header-value',
      enabled: true
    }, {
      name: 'disabled-refresh-header',
      value: 'disabled-refresh-header-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_refresh_queryparams).toEqual([{
      name: 'refresh-query-param',
      value: 'refresh-query-param-value',
      enabled: true
    }, {
      name: 'disabled-refresh-query-param',
      value: 'disabled-refresh-query-param-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_refresh_bodyvalues).toEqual([{
      name: 'refresh-body',
      value: 'refresh-body-value',
      enabled: true
    }, {
      name: 'disabled-refresh-body',
      value: 'disabled-refresh-body-value',
      enabled: false
    }]);
  });
});

describe('OAuth2 Additional Parameters - collection/folder level', () => {
  it('should parse all oauth2 additional parameters config types together', () => {
    const input = `
auth {
  mode: oauth2
}

auth:oauth2 {
  grant_type: authorization_code
  client_id: bruno-client-id
  client_secret: bruno-client-secret
  authorization_url: https://auth.usebruno.com/oauth/authorize
  access_token_url: https://auth.usebruno.com/oauth/token
}

auth:oauth2:authorization_headers {
  auth-header: auth-header-value
  ~disabled-auth-header: disabled-auth-header-value
}

auth:oauth2:authorization_queryparams {
  auth-query-param: auth-query-param-value
  ~disabled-auth-query-param: disabled-auth-query-param-value
}

auth:oauth2:token_headers {
  token-header: token-header-value
  ~disabled-token-header: disabled-token-header-value
}

auth:oauth2:token_queryparams {
  token-query-param: token-query-param-value
  ~disabled-token-query-param: disabled-token-query-param-value
}

auth:oauth2:token_bodyvalues {
  token-body: token-body-value
  ~disabled-token-body: disabled-token-body-value
}

auth:oauth2:refresh_headers {
  refresh-header: refresh-header-value
  ~disabled-refresh-header: disabled-refresh-header-value
}

auth:oauth2:refresh_queryparams {
  refresh-query-param: refresh-query-param-value
  ~disabled-refresh-query-param: disabled-refresh-query-param-value
}

auth:oauth2:refresh_bodyvalues {
  refresh-body: refresh-body-value
  ~disabled-refresh-body: disabled-refresh-body-value
}
   `.trim();

    const result = collectionBruToJson(input);
    
    // Verify all config types are present
    expect(result).toHaveProperty('oauth2_additional_parameters_authorization_headers');
    expect(result).toHaveProperty('oauth2_additional_parameters_authorization_queryparams');
    expect(result).toHaveProperty('oauth2_additional_parameters_token_headers');
    expect(result).toHaveProperty('oauth2_additional_parameters_token_queryparams');
    expect(result).toHaveProperty('oauth2_additional_parameters_token_bodyvalues');
    expect(result).toHaveProperty('oauth2_additional_parameters_refresh_headers');
    expect(result).toHaveProperty('oauth2_additional_parameters_refresh_queryparams');
    expect(result).toHaveProperty('oauth2_additional_parameters_refresh_bodyvalues');

    // Verify each has exactly one parameter
    expect(result.oauth2_additional_parameters_authorization_headers).toHaveLength(2);
    expect(result.oauth2_additional_parameters_authorization_queryparams).toHaveLength(2);
    expect(result.oauth2_additional_parameters_token_headers).toHaveLength(2);
    expect(result.oauth2_additional_parameters_token_queryparams).toHaveLength(2);
    expect(result.oauth2_additional_parameters_token_bodyvalues).toHaveLength(2);
    expect(result.oauth2_additional_parameters_refresh_headers).toHaveLength(2);
    expect(result.oauth2_additional_parameters_refresh_queryparams).toHaveLength(2);
    expect(result.oauth2_additional_parameters_refresh_bodyvalues).toHaveLength(2);

    // Verify parameter values
    expect(result.oauth2_additional_parameters_authorization_headers).toEqual([{
      name: 'auth-header',
      value: 'auth-header-value',
      enabled: true
    }, {
      name: 'disabled-auth-header',
      value: 'disabled-auth-header-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_authorization_queryparams).toEqual([{
      name: 'auth-query-param',
      value: 'auth-query-param-value',
      enabled: true
    }, {
      name: 'disabled-auth-query-param',
      value: 'disabled-auth-query-param-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_token_headers).toEqual([{
      name: 'token-header',
      value: 'token-header-value',
      enabled: true
    }, {
      name: 'disabled-token-header',
      value: 'disabled-token-header-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_token_queryparams).toEqual([{
      name: 'token-query-param',
      value: 'token-query-param-value',
      enabled: true
    }, {
      name: 'disabled-token-query-param',
      value: 'disabled-token-query-param-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_token_bodyvalues).toEqual([{
      name: 'token-body',
      value: 'token-body-value',
      enabled: true
    }, {
      name: 'disabled-token-body',
      value: 'disabled-token-body-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_refresh_headers).toEqual([{
      name: 'refresh-header',
      value: 'refresh-header-value',
      enabled: true
    }, {
      name: 'disabled-refresh-header',
      value: 'disabled-refresh-header-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_refresh_queryparams).toEqual([{
      name: 'refresh-query-param',
      value: 'refresh-query-param-value',
      enabled: true
    }, {
      name: 'disabled-refresh-query-param',
      value: 'disabled-refresh-query-param-value',
      enabled: false
    }]);
    
    expect(result.oauth2_additional_parameters_refresh_bodyvalues).toEqual([{
      name: 'refresh-body',
      value: 'refresh-body-value',
      enabled: true
    }, {
      name: 'disabled-refresh-body',
      value: 'disabled-refresh-body-value',
      enabled: false
    }]);
  });
});