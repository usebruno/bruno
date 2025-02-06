const yaml = require('js-yaml');
const _ = require('lodash');

const parseRequest = (yamlContent) => {
  const yamlData = yaml.load(yamlContent);
  const isHttp = !!yamlData.http;
  const request = isHttp ? yamlData.http : yamlData.graphql;

  const item = {
    name: yamlData.meta.name,
    description: yamlData.meta.description || '',
    seq: yamlData.meta.seq,
    type: isHttp ? 'http-request' : 'graphql-request'
  };

  item.request = {
    method: request.method.toUpperCase(),
    url: request.url,
    headers: _.map(request.headers || [], header => ({
      name: header.name,
      value: header.value,
      description: header.description || '',
      enabled: !header.disabled
    })),
    params: _.flatMap(request.params || {}, (params, type) => {
      return _.map(params, param => ({
        name: param.name,
        value: param.value,
        type,
        description: param.description || '',
        enabled: !param.disabled
      }));
    }),
    body: {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: null
    },
    auth: {
      mode: 'none',
      awsv4: null,
      basic: null,
      bearer: null,
      ntlm: null,
      digest: null,
      oauth2: null,
      wsse: null,
      apikey: null
    },
    vars: {
      req: [],
      res: []
    },
    script: {
      req: '',
      res: ''
    },
    tests: '',
    docs: ''
  };

  // Handle body
  if (request.body) {
    item.request.body.mode = request.body.type;
    switch(request.body.type) {
      case 'json':
        item.request.body.json = request.body.data;
        break;
      case 'text':
        item.request.body.text = request.body.data;
        break;
      case 'xml':
        item.request.body.xml = request.body.data;
        break;
      case 'sparql':
        item.request.body.sparql = request.body.data;
        break;
      case 'formUrlEncoded':
        item.request.body.formUrlEncoded = _.map(request.body.data, formItem => ({
          name: formItem.name,
          value: formItem.value,
          description: formItem.description || '',
          enabled: !formItem.disabled
        }));
        break;
      case 'multipartForm':
        item.request.body.multipartForm = _.map(request.body.data, formItem => ({
          name: formItem.name,
          value: formItem.value,
          description: formItem.description || '',
          enabled: !formItem.disabled,
          contentType: formItem.content_type || ''
        }));
        break;
      case 'graphql':
        item.request.body.graphql = {
          query: request.body.data.query || '',
          variables: request.body.data.variables || ''
        };
        break;
    }
  }

  // Handle auth
  if (request.auth) {
    item.request.auth.mode = request.auth.type;

    switch(request.auth.type) {
      case 'awsv4':
        item.request.auth.awsv4 = {
          accessKeyId: request.auth.access_key_id,
          secretAccessKey: request.auth.secret_access_key,
          sessionToken: request.auth.session_token,
          service: request.auth.service,
          region: request.auth.region,
          profileName: request.auth.profile_name
        }
        break;
      case 'basic':
        item.request.auth.basic = {
          username: request.auth.username,
          password: request.auth.password
        }
        break;
      case 'bearer':
        item.request.auth.bearer = {
          token: request.auth.token
        }
        break;
      case 'digest':
        item.request.auth.digest = {
          username: request.auth.username,
          password: request.auth.password
        }
        break;
      case 'ntlm':
        item.request.auth.ntlm = {
          username: request.auth.username,
          password: request.auth.password,
          domain: request.auth.domain
        }
        break;
      case 'wsse':
        item.request.auth.wsse = {
          username: request.auth.username,
          password: request.auth.password
        }
        break;
      case 'apikey':
        item.request.auth.apikey = {
          key: request.auth.key,
          value: request.auth.value,
          placement: request.auth.placement
        }
        break;
      case 'oauth2':
        if (request.auth.grant_type === 'password') {
          item.request.auth.oauth2 = {
            grantType: 'password',
            accessTokenUrl: request.auth.access_token_url || '',
            clientId: request.auth.client_id || '',
            clientSecret: request.auth.client_secret || '',
            scope: request.auth.scope || '',
            username: request.auth.username || '',
            password: request.auth.password || ''
          };
        } else if (request.auth.grant_type === 'authorization_code') {
          item.request.auth.oauth2 = {
            grantType: 'authorization_code',
            accessTokenUrl: request.auth.access_token_url || '',
            clientId: request.auth.client_id || '',
            clientSecret: request.auth.client_secret || '',
            scope: request.auth.scope || '',
            callbackUrl: request.auth.callback_url || '',
            authorizationUrl: request.auth.authorization_url || '',
            state: request.auth.state || '',
            pkce: request.auth.pkce || false
          };
        } else if (request.auth.grant_type === 'client_credentials') {
          item.request.auth.oauth2 = {
            grantType: 'client_credentials',
            accessTokenUrl: request.auth.access_token_url || '',
            clientId: request.auth.client_id || '',
            clientSecret: request.auth.client_secret || '',
            scope: request.auth.scope || ''
          };
        }
        break;
    }
  }

  // Handle vars
  if (yamlData.vars) {
    item.request.vars = {
      req: _.map(yamlData.vars['pre-request'] || [], v => ({
        name: v.name,
        value: v.value,
        description: v.description || '',
        enabled: !v.disabled
      })),
      res: _.map(yamlData.vars['post-response'] || [], v => ({
        name: v.name,
        value: v.value,
        description: v.description || '',
        enabled: !v.disabled
      }))
    };
  }

  // Handle scripts
  if (yamlData.scripts) {
    item.request.script = {
      req: yamlData.scripts['pre-request'] || '',
      res: yamlData.scripts['post-response'] || ''
    };
  }

  // Handle tests and docs
  if (yamlData.tests) {
    item.request.tests = yamlData.tests;
  }

  if (yamlData.docs) {
    item.request.docs = yamlData.docs;
  }

  return item;
};

module.exports = parseRequest; 