const getBruJsonWithAdditionalParams = (grantType) => ({
  "meta": {
    "name": "OAuth2 Additional Params Test",
    "type": "http",
    "seq": 1
  },
  "http": {
    "method": "get",
    "url": "https://api.usebruno.com/protected"
  },
  "auth": {
    "oauth2": {
      "grantType": grantType,
    },
  },
  "oauth2_additional_parameters_authorization_headers": [
    {
      "name": "auth-header",
      "value": "auth-header-value",
      "enabled": true
    },
    {
      "name": "disabled-auth-header",
      "value": "disabled-auth-header-value",
      "enabled": false
    }
  ],
  "oauth2_additional_parameters_authorization_queryparams": [
    {
      "name": "auth-query-param",
      "value": "auth-query-param-value",
      "enabled": true
    },
    {
      "name": "disabled-auth-query-param",
      "value": "disabled-auth-query-param-value",
      "enabled": false
    }
  ],
  "oauth2_additional_parameters_token_headers": [
    {
      "name": "token-header",
      "value": "token-header-value",
      "enabled": true
    },
    {
      "name": "disabled-token-header",
      "value": "disabled-token-header-value",
      "enabled": false
    }
  ],
  "oauth2_additional_parameters_token_queryparams": [
    {
      "name": "token-query-param",
      "value": "token-query-param-value",
      "enabled": true
    },
    {
      "name": "disabled-token-query-param",
      "value": "disabled-token-query-param-value",
      "enabled": false
    }
  ],
  "oauth2_additional_parameters_token_bodyvalues": [
    {
      "name": "token-body",
      "value": "token-body-value",
      "enabled": true
    },
    {
      "name": "disabled-token-body",
      "value": "disabled-token-body-value",
      "enabled": false
    }
  ],
  "oauth2_additional_parameters_refresh_headers": [
    {
      "name": "refresh-header",
      "value": "refresh-header-value",
      "enabled": true
    },
    {
      "name": "disabled-refresh-header",
      "value": "disabled-refresh-header-value",
      "enabled": false
    }
  ],
  "oauth2_additional_parameters_refresh_queryparams": [
    {
      "name": "refresh-query-param",
      "value": "refresh-query-param-value",
      "enabled": true
    },
    {
      "name": "disabled-refresh-query-param",
      "value": "disabled-refresh-query-param-value",
      "enabled": false
    }
  ],
  "oauth2_additional_parameters_refresh_bodyvalues": [
    {
      "name": "refresh-body",
      "value": "refresh-body-value",
      "enabled": true
    },
    {
      "name": "disabled-refresh-body",
      "value": "disabled-refresh-body-value",
      "enabled": false
    }
  ]
})

export {
  getBruJsonWithAdditionalParams
};
