const _ = require('lodash');

const getMeta = (json) => {
  const sequence = _.get(json, 'seq');
  const meta = {
    name: _.get(json, 'name')
  };

  const description = _.get(json, 'description');
  if (description) {
    meta.description = description;
  }

  meta.seq = !isNaN(sequence) ? Number(sequence) : 1;

  return meta;
};

const getParams = (req) => {
  return {
    query: _.map(_.filter(req?.params || [], param => param.type === 'query'), (param) => {
      const paramObj = {
        name: param.name,
        value: param.value,
        type: param.type
      };
      
      if (param.description) {
        paramObj.description = param.description;
      }
      
      if (param.enabled === false) {
        paramObj.disabled = true;
      }
      
      return paramObj;
    }),
    path: _.map(_.filter(req?.params || [], param => param.type === 'path'), (param) => {
      const paramObj = {
        name: param.name,
        value: param.value,
        type: param.type
      };
      
      if (param.description) {
        paramObj.description = param.description;
      }
      
      if (param.enabled === false) {
        paramObj.disabled = true;
      }
      
      return paramObj;
    })
  }
};

const getHeaders = (req) => {
  return _.map(_.get(req, 'headers', []), (header) => {
    const headerObj = {
      name: header.name,
      value: header.value,
    };

    if (header.description) {
      headerObj.description = header.description;
    }

    if (header.enabled === false) {
      headerObj.disabled = true;
    }

    return headerObj;
  });
};

const getBody = (req) => {
  const body = _.get(req, 'body', {});
  const mode = _.get(body, 'mode', 'none');

  if (mode === 'none') {
    return null;
  }

  if (mode === 'graphql') {
    return {
      type: 'graphql',
      query: _.get(body, 'graphql.query', ''),
      variables: _.get(body, 'graphql.variables', '')
    };
  }

  if (mode === 'sparql') {
    return {
      type: 'sparql',
      query: _.get(body, 'sparql', '')
    };
  }

  if (mode === 'formUrlEncoded') {
    return {
      type: 'form-urlencoded',
      data: _.map(_.get(body, 'formUrlEncoded', []), (param) => {
        const paramObj = {
          name: param.name,
          value: param.value
        };

        if (param.description) {
          paramObj.description = param.description;
        }

        if (param.enabled === false) {
          paramObj.disabled = true;
        }

        return paramObj;
      })
    };
  }

  if (mode === 'multipartForm') {
    return {
      type: 'multipart-form',
      data: _.map(_.get(body, 'multipartForm', []), (param) => {
        const paramObj = {
          name: param.name,
          value: param.value,
          type: param.type
        };

        if (param.description) {
          paramObj.description = param.description;
        }

        if (param.enabled === false) {
          paramObj.disabled = true;
        }

        if (param.contentType) {
          paramObj.content_type = param.contentType;
        }

        return paramObj;
      })
    };
  }

  let data = '';
  switch(mode) {
    case 'json':
      data = _.get(body, 'json', '');
      break;
    case 'text':
      data = _.get(body, 'text', '');
      break;
    case 'xml':
      data = _.get(body, 'xml', '');
      break;
  }

  return {
    type: mode,
    data
  };
};

const getAuth = (req) => {
  const auth = {};
  const mode = _.get(req, 'auth.mode', 'none');

  if (req?.auth?.awsv4) {
    auth.awsv4 = {
      access_key_id: req?.auth?.awsv4?.accessKeyId,
      secret_access_key: req?.auth?.awsv4?.secretAccessKey,
      session_token: req?.auth?.awsv4?.sessionToken,
      service: req?.auth?.awsv4?.service,
      region: req?.auth?.awsv4?.region,
      profile_name: req?.auth?.awsv4?.profileName
    };
  }

  if (req?.auth?.basic) {
    auth.basic = {
      username: req?.auth?.basic?.username,
      password: req?.auth?.basic?.password
    };
  }

  if (req?.auth?.bearer) {
    auth.bearer = {
      token: req?.auth?.bearer?.token
    };
  }

  if (req?.auth?.digest) {
    auth.digest = {
      username: req?.auth?.digest?.username,
      password: req?.auth?.digest?.password
    };
  }

  if (req?.auth?.ntlm) {
    auth.ntlm = {
      username: req?.auth?.ntlm?.username,
      password: req?.auth?.ntlm?.password,
      domain: req?.auth?.ntlm?.domain
    };
  }

  if (req?.auth?.oauth2) {
    auth.oauth2 = {};
    
    if (req?.auth?.oauth2?.grantType === 'password') {
      auth.oauth2 = {
        grant_type: 'password',
        access_token_url: req?.auth?.oauth2?.accessTokenUrl || '',
        username: req?.auth?.oauth2?.username || '',
        password: req?.auth?.oauth2?.password || '',
        client_id: req?.auth?.oauth2?.clientId || '',
        client_secret: req?.auth?.oauth2?.clientSecret || '',
        scope: req?.auth?.oauth2?.scope || ''
      };
    }

    if (req?.auth?.oauth2?.grantType === 'authorization_code') {
      auth.oauth2 = {
        grant_type: 'authorization_code',
        callback_url: req?.auth?.oauth2?.callbackUrl || '',
        authorization_url: req?.auth?.oauth2?.authorizationUrl || '',
        access_token_url: req?.auth?.oauth2?.accessTokenUrl || '',
        client_id: req?.auth?.oauth2?.clientId || '',
        client_secret: req?.auth?.oauth2?.clientSecret || '',
        scope: req?.auth?.oauth2?.scope || '',
        state: req?.auth?.oauth2?.state || '',
        pkce: req?.auth?.oauth2?.pkce || false
      };
    }

    if (req?.auth?.oauth2?.grantType === 'client_credentials') {
      auth.oauth2 = {
        grant_type: 'client_credentials',
        access_token_url: req?.auth?.oauth2?.accessTokenUrl || '',
        client_id: req?.auth?.oauth2?.clientId || '',
        client_secret: req?.auth?.oauth2?.clientSecret || '',
        scope: req?.auth?.oauth2?.scope || ''
      };
    }
  }

  if (req?.auth?.apikey) {
    auth.apikey = {
      key: req?.auth?.apikey?.key,
      value: req?.auth?.apikey?.value,
      placement: req?.auth?.apikey?.placement
    };
  }

  return {
    type: mode,
    ...auth
  };
};

const getVars = (req) => {
  const preRequest = _.map(_.get(req, 'vars.req', []), (variable) => {
    const varObj = {
      name: variable.name,
      value: variable.value
    };

    if (variable.description) {
      varObj.description = variable.description;
    }

    if (variable.enabled === false) {
      varObj.disabled = true;
    }

    return varObj;
  });

  const postResponse = _.map(_.get(req, 'vars.res', []), (variable) => {
    const varObj = {
      name: variable.name,
      value: variable.value
    };

    if (variable.description) {
      varObj.description = variable.description;
    }

    if (variable.enabled === false) {
      varObj.disabled = true;
    }

    return varObj;
  });

  const vars = {};
  
  if(preRequest.length) {
    vars['pre-request'] = preRequest;
  }
  
  if(postResponse.length) {
    vars['post-response'] = postResponse;
  }

  return !_.isEmpty(vars) ? vars : null;
};

const getScripts = (req) => {
  const preRequestScript = _.get(req, 'script.req', '');
  const postResponseScript = _.get(req, 'script.res', '');
  
  const scripts = {};
  if (preRequestScript) {
    scripts['pre-request'] = preRequestScript;
  }
  if (postResponseScript) {
    scripts['post-response'] = postResponseScript;
  }

  return !_.isEmpty(scripts) ? scripts : null;
};

const getTests = (req) => {
  return _.get(req, 'tests', '');
};

const getDocs = (req) => {
  return _.get(req, 'docs',  '');
};

module.exports = {
  getMeta,
  getParams,
  getHeaders,
  getBody,
  getAuth,
  getVars,
  getScripts,
  getTests,
  getDocs
}; 