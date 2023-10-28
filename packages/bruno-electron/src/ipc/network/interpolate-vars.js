const Handlebars = require('handlebars');
const { each, forOwn, cloneDeep } = require('lodash');
const { getVault } = require('../../vault/vault');
const { vaultVariableRegex } = require('@usebruno/app/src/utils/vault');

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return contentType;
};

const interpolateEnvVars = (str, processEnvVars) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const template = Handlebars.compile(str, { noEscape: true });

  return template({
    process: {
      env: {
        ...processEnvVars
      }
    }
  });
};

const interpolateVars = async (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
  // we clone envVars because we don't want to modify the original object
  envVars = cloneDeep(envVars);

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolateEnvVars(value, processEnvVars);
  });

  const vault = getVault(envVars);

  const interpolate = async (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    if (vault) {
      str = await vault.replaceVariables(str, envVars);
    } else if (str.match(vaultVariableRegex)) {
      console.warn(
        'Using Vault variable but Vault is not initialized. Check your VAULT_ADDR and VAULT_TOKEN_FILE_PATH environment variables.'
      );
    }

    const template = Handlebars.compile(str, { noEscape: true });

    // collectionVariables take precedence over envVars
    const combinedVars = {
      ...envVars,
      ...collectionVariables,
      process: {
        env: {
          ...processEnvVars
        }
      }
    };

    return template(combinedVars);
  };

  request.url = await interpolate(request.url);

  for (const key in request.headers) {
    if (request.headers.hasOwnProperty(key)) {
      const value = request.headers[key];
      delete request.headers[key];

      const headerKey = await interpolate(key);
      request.headers[headerKey] = await interpolate(value);
    }
  }

  const contentType = getContentType(request.headers);

  if (contentType.includes('json')) {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = await interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }

    if (typeof request.data === 'string') {
      if (request.data.length) {
        request.data = await interpolate(request.data);
      }
    }
  } else if (contentType === 'application/x-www-form-urlencoded') {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = await interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }
  } else {
    request.data = await interpolate(request.data);
  }

  each(request.params, async (param) => {
    param.value = await interpolate(param.value);
  });

  if (request.proxy) {
    request.proxy.protocol = await interpolate(request.proxy.protocol);
    request.proxy.hostname = await interpolate(request.proxy.hostname);
    request.proxy.port = await interpolate(request.proxy.port);

    if (request.proxy.auth) {
      request.proxy.auth.username = await interpolate(request.proxy.auth.username);
      request.proxy.auth.password = await interpolate(request.proxy.auth.password);
    }
  }

  // todo: we have things happening in two places w.r.t basic auth
  //       need to refactor this in the future
  // the request.auth (basic auth) object gets set inside the prepare-request.js file
  if (request.auth) {
    const username = (await interpolate(request.auth.username)) || '';
    const password = (await interpolate(request.auth.password)) || '';

    // use auth header based approach and delete the request.auth object
    request.headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.auth;
  }

  // await interpolate vars for aws sigv4 auth
  if (request.awsv4config) {
    request.awsv4config.accessKeyId = (await interpolate(request.awsv4config.accessKeyId)) || '';
    request.awsv4config.secretAccessKey = (await interpolate(request.awsv4config.secretAccessKey)) || '';
    request.awsv4config.sessionToken = (await interpolate(request.awsv4config.sessionToken)) || '';
    request.awsv4config.service = (await interpolate(request.awsv4config.service)) || '';
    request.awsv4config.region = (await interpolate(request.awsv4config.region)) || '';
    request.awsv4config.profileName = (await interpolate(request.awsv4config.profileName)) || '';
  }

  return request;
};

module.exports = interpolateVars;
