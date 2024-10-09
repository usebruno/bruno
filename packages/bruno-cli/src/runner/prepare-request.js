const { get, each, filter } = require('lodash');
const fs = require('fs');
var JSONbig = require('json-bigint');
const decomment = require('decomment');
const crypto = require('node:crypto');

const prepareRequest = (request, collectionRoot) => {
  const headers = {};
  let contentTypeDefined = false;

  // collection headers
  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  each(request.headers, (h) => {
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
    pathParams: request?.params?.filter((param) => param.type === 'path')
  };

  const collectionAuth = get(collectionRoot, 'request.auth');
  if (collectionAuth && request.auth.mode === 'inherit') {
    if (collectionAuth.mode === 'basic') {
      axiosRequest.auth = {
        username: get(collectionAuth, 'basic.username'),
        password: get(collectionAuth, 'basic.password')
      };
    }

    if (collectionAuth.mode === 'bearer') {
      axiosRequest.headers['Authorization'] = `Bearer ${get(collectionAuth, 'bearer.token')}`;
    }
  }

  if (request.auth) {
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
  }

  request.body = request.body || {};

  if (request.body.mode === 'json') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    let jsonBody;
    try {
      jsonBody = decomment(request?.body?.json);
    } catch (error) {
      jsonBody = request?.body?.json;
    }
    try {
      axiosRequest.data = JSONbig.parse(jsonBody);
    } catch (error) {
      axiosRequest.data = jsonBody;
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
      axiosRequest.headers['content-type'] = 'text/xml';
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
    const params = {};
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    each(enabledParams, (p) => (params[p.name] = p.value));
    axiosRequest.data = params;
  }

  if(request.body.mode === 'rawFile') {
    if (request.body.rawFile) {
      axiosRequest.data = fs.readFileSync(request.body.rawFile);
      fileLength = axiosRequest.data.length;
      axiosRequest.headers['content-length'] = fileLength;
    } else {
      axiosRequest.data = null;
    }
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

  if (request.script && request.script.length) {
    axiosRequest.script = request.script;
  }

  return axiosRequest;
};

module.exports = prepareRequest;
