const { get, each, filter } = require('lodash');
const decomment = require('decomment');
const crypto = require('node:crypto');
const { mergeHeaders, mergeScripts, mergeVars, getTreePathFromCollectionToItem } = require('../utils/collection');
const { createFormData } = require('../utils/form-data');

const prepareRequest = (item = {}, collection = {}) => {
  const request = item?.request;
  const brunoConfig = get(collection, 'brunoConfig', {});
  const headers = {};
  let contentTypeDefined = false;

  const scriptFlow = brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
  }

  each(get(request, 'headers', []), (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  let axiosRequest = {
    method: request.method,
    url: request.url,
    headers: headers,
    pathParams: request?.params?.filter((param) => param.type === 'path'),
    responseType: 'arraybuffer'
  };

  const collectionAuth = get(collection, 'root.request.auth');
  if (collectionAuth && request.auth?.mode === 'inherit') {
    if (collectionAuth.mode === 'basic') {
      axiosRequest.auth = {
        username: get(collectionAuth, 'basic.username'),
        password: get(collectionAuth, 'basic.password')
      };
    }

    if (collectionAuth.mode === 'bearer') {
      axiosRequest.headers['Authorization'] = `Bearer ${get(collectionAuth, 'bearer.token')}`;
    }

    if (collectionAuth.mode === 'apikey') {
      if (collectionAuth.apikey?.placement === 'header') {
        axiosRequest.headers[collectionAuth.apikey?.key] = collectionAuth.apikey?.value;
      }
      
      if (collectionAuth.apikey?.placement === 'queryparams') {
        if (axiosRequest.url && collectionAuth.apikey?.key) {
          try {
            const urlObj = new URL(request.url);
            urlObj.searchParams.set(collectionAuth.apikey?.key, collectionAuth.apikey?.value);
            axiosRequest.url = urlObj.toString();
          } catch (error) {
            console.error('Invalid URL:', request.url, error);
          }
        }
      }
    }

    if (collectionAuth.mode === 'awsv4') {
      axiosRequest.awsv4config = {
        accessKeyId: get(collectionAuth, 'awsv4.accessKeyId'),
        secretAccessKey: get(collectionAuth, 'awsv4.secretAccessKey'),
        sessionToken: get(collectionAuth, 'awsv4.sessionToken'),
        service: get(collectionAuth, 'awsv4.service'),
        region: get(collectionAuth, 'awsv4.region'),
        profileName: get(collectionAuth, 'awsv4.profileName')
      };
    }

    if (collectionAuth.mode === 'ntlm') {
      axiosRequest.ntlmConfig = {
        username: get(collectionAuth, 'ntlm.username'),
        password: get(collectionAuth, 'ntlm.password'),
        domain: get(collectionAuth, 'ntlm.domain')
      };
    }

    if (collectionAuth.mode === 'wsse') {
      const username = get(collectionAuth, 'wsse.username', '');
      const password = get(collectionAuth, 'wsse.password', '');

      const ts = new Date().toISOString();
      const nonce = crypto.randomBytes(16).toString('hex');

      // Create the password digest using SHA-1 as required for WSSE
      const hash = crypto.createHash('sha1');
      hash.update(nonce + ts + password);
      const digest = Buffer.from(hash.digest('hex').toString('utf8')).toString('base64');

      // Construct the WSSE header
      axiosRequest.headers[
        'X-WSSE'
      ] = `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonce}", Created="${ts}"`;
    }

    if (collectionAuth.mode === 'digest') {
      axiosRequest.digestAuth = {
        username: get(collectionAuth, 'digest.username'),
        password: get(collectionAuth, 'digest.password')
      };
    }
  }

  if (request.auth && request.auth.mode !== 'inherit') {
    if (request.auth.mode === 'basic') {
      axiosRequest.auth = {
        username: get(request, 'auth.basic.username'),
        password: get(request, 'auth.basic.password')
      };
    }

    if (request.auth.mode === 'awsv4') {
      axiosRequest.awsv4config = {
        accessKeyId: get(request, 'auth.awsv4.accessKeyId'),
        secretAccessKey: get(request, 'auth.awsv4.secretAccessKey'),
        sessionToken: get(request, 'auth.awsv4.sessionToken'),
        service: get(request, 'auth.awsv4.service'),
        region: get(request, 'auth.awsv4.region'),
        profileName: get(request, 'auth.awsv4.profileName')
      };
    }

    if (request.auth.mode === 'ntlm') {
      axiosRequest.ntlmConfig = {
        username: get(request, 'auth.ntlm.username'),
        password: get(request, 'auth.ntlm.password'),
        domain: get(request, 'auth.ntlm.domain')
      };
    }

    if (request.auth.mode === 'bearer') {
      axiosRequest.headers['Authorization'] = `Bearer ${get(request, 'auth.bearer.token')}`;
    }

    if (request.auth.mode === 'wsse') {
      const username = get(request, 'auth.wsse.username', '');
      const password = get(request, 'auth.wsse.password', '');

      const ts = new Date().toISOString();
      const nonce = crypto.randomBytes(16).toString('hex');

      // Create the password digest using SHA-1 as required for WSSE
      const hash = crypto.createHash('sha1');
      hash.update(nonce + ts + password);
      const digest = Buffer.from(hash.digest('hex').toString('utf8')).toString('base64');

      // Construct the WSSE header
      axiosRequest.headers[
        'X-WSSE'
      ] = `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonce}", Created="${ts}"`;
    }

    if (request.auth.mode === 'apikey') {
      if (request.auth.apikey?.placement === 'header') {
        axiosRequest.headers[request.auth.apikey?.key] = request.auth.apikey?.value;
      }
      
      if (request.auth.apikey?.placement === 'queryparams') {
        if (axiosRequest.url && request.auth.apikey?.key) {
          try {
            const urlObj = new URL(request.url);
            urlObj.searchParams.set(request.auth.apikey?.key, request.auth.apikey?.value);
            axiosRequest.url = urlObj.toString();
          } catch (error) {
            console.error('Invalid URL:', request.url, error);
          }
        }
      }
    }

    if (request.auth.mode === 'wsse') {
      const username = get(request, 'auth.wsse.username', '');
      const password = get(request, 'auth.wsse.password', '');

      const ts = new Date().toISOString();
      const nonce = crypto.randomBytes(16).toString('hex');

      // Create the password digest using SHA-1 as required for WSSE
      const hash = crypto.createHash('sha1');
      hash.update(nonce + ts + password);
      const digest = Buffer.from(hash.digest('hex').toString('utf8')).toString('base64');

      // Construct the WSSE header
      axiosRequest.headers[
        'X-WSSE'
      ] = `UsernameToken Username="${username}", PasswordDigest="${digest}", Nonce="${nonce}", Created="${ts}"`;
    }

    if (request.auth.mode === 'digest') {
      axiosRequest.digestAuth = {
        username: get(request, 'auth.digest.username'),
        password: get(request, 'auth.digest.password')
      };
    }
  }

  request.body = request.body || {};

  if (request.body.mode === 'json') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    try {
      axiosRequest.data = decomment(request?.body?.json);
    } catch (error) {
      axiosRequest.data = request?.body?.json;
    }
  }

  if (request.body.mode === 'text') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'text/plain';
    }
    axiosRequest.data = request.body.text;
  }

  if (request.body.mode === 'xml') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/xml';
    }
    axiosRequest.data = request.body.xml;
  }

  if (request.body.mode === 'sparql') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/sparql-query';
    }
    axiosRequest.data = request.body.sparql;
  }

  if (request.body.mode === 'formUrlEncoded') {
    axiosRequest.headers['content-type'] = 'application/x-www-form-urlencoded';
    const params = {};
    const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
    each(enabledParams, (p) => (params[p.name] = p.value));
    axiosRequest.data = params;
  }
  
  if (request.body.mode === 'multipartForm') {
    axiosRequest.headers['content-type'] = 'multipart/form-data';
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    axiosRequest.data = enabledParams;
  }

  if (request.body.mode === 'graphql') {
    const graphqlQuery = {
      query: get(request, 'body.graphql.query'),
      variables: JSON.parse(decomment(get(request, 'body.graphql.variables') || '{}'))
    };
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    axiosRequest.data = graphqlQuery;
  }

  if (request.script) {
    axiosRequest.script = request.script;
  }

  if (request.tests) {
    axiosRequest.tests = request.tests;
  }

  axiosRequest.vars = request.vars;
  axiosRequest.collectionVariables = request.collectionVariables;
  axiosRequest.folderVariables = request.folderVariables;
  axiosRequest.requestVariables = request.requestVariables;

  return axiosRequest;
};

module.exports = prepareRequest;
