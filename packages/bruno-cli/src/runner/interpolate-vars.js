const { interpolate } = require('@usebruno/common');
const { each, forOwn, cloneDeep, extend } = require('lodash');
const FormData = require('form-data');
const fs = require('fs');

const getNameFromFormKey = (formKeyString) => {
  // Example formKeyString:
  // '----------------------------111889243577309058514306\r\n Content-Disposition: form-data; name=""foo""\r\n'
  if (typeof formKeyString == 'string') {
    let name = formKeyString.split('name="')?.[1]?.trim();
    if (name?.slice(-1) == '"') {
      name = name?.slice(0, -1);
    }
    name = name?.split('";')?.[0];
    return name;
  }
};

const getFilenameFromFormKey = (formKeyString) => {
  // Example formKeyString:
  // ----------------------------160947275217288416797863 Content-Disposition: form-data; name="file"; filename="Screenshot 2024-05-16 at 9.33.12 PM.png" Content-Type: image/png
  if (typeof formKeyString == 'string') {
    let filename = formKeyString.split('filename="')?.[1]?.split('Content-Type')?.[0].trim();
    filename = filename?.slice(0, -1);
    return filename;
  }
};

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return contentType;
};

const interpolateVars = (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
  // we clone envVars because we don't want to modify the original object
  envVars = cloneDeep(envVars);

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolate(value, {
      process: {
        env: {
          ...processEnvVars
        }
      }
    });
  });

  const _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

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

    return interpolate(str, combinedVars);
  };

  const interpolateFormData = (form) => {
    if (!(form instanceof FormData)) {
      return form;
    } else {
      let interpolatedForm = new FormData();
      let data = form?._streams || [];
      for (let index in data) {
        if (index % 3 !== 0) {
          continue;
        }
        let formKeyString = data[index];
        let formValue = data[parseInt(index) + 1];
        const formKeyName = getNameFromFormKey(formKeyString);
        if (!formKeyName.length) continue;
        const formKeyFilename = getFilenameFromFormKey(formKeyString);
        if (formKeyFilename?.length) {
          let formFilePath = formValue?.source?.path;
          if (fs.existsSync(formFilePath)) {
            interpolatedForm.append(_interpolate(formKeyName), fs.createReadStream(formFilePath));
          }
        } else {
          interpolatedForm.append(_interpolate(formKeyName), _interpolate(formValue));
        }
      }
      return interpolatedForm;
    }
  };

  request.url = _interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[_interpolate(key)] = _interpolate(value);
  });

  const contentType = getContentType(request.headers);

  if (contentType.includes('json')) {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = _interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }

    if (typeof request.data === 'string') {
      if (request.data.length) {
        request.data = _interpolate(request.data);
      }
    }
  } else if (contentType === 'application/x-www-form-urlencoded') {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = _interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }
  } else if (contentType === 'multipart/form-data') {
    const interpolatedFormData = interpolateFormData(request.data);
    extend(request.headers, interpolatedFormData.getHeaders());
    request.data = interpolatedFormData;
  } else {
    request.data = _interpolate(request.data);
  }

  each(request.params, (param) => {
    param.value = _interpolate(param.value);
  });

  if (request.proxy) {
    request.proxy.protocol = _interpolate(request.proxy.protocol);
    request.proxy.hostname = _interpolate(request.proxy.hostname);
    request.proxy.port = _interpolate(request.proxy.port);

    if (request.proxy.auth) {
      request.proxy.auth.username = _interpolate(request.proxy.auth.username);
      request.proxy.auth.password = _interpolate(request.proxy.auth.password);
    }
  }

  // todo: we have things happening in two places w.r.t basic auth
  //       need to refactor this in the future
  // the request.auth (basic auth) object gets set inside the prepare-request.js file
  if (request.auth) {
    const username = _interpolate(request.auth.username) || '';
    const password = _interpolate(request.auth.password) || '';

    // use auth header based approach and delete the request.auth object
    request.headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.auth;
  }

  if (request.awsv4config) {
    request.awsv4config.accessKeyId = _interpolate(request.awsv4config.accessKeyId) || '';
    request.awsv4config.secretAccessKey = _interpolate(request.awsv4config.secretAccessKey) || '';
    request.awsv4config.sessionToken = _interpolate(request.awsv4config.sessionToken) || '';
    request.awsv4config.service = _interpolate(request.awsv4config.service) || '';
    request.awsv4config.region = _interpolate(request.awsv4config.region) || '';
    request.awsv4config.profileName = _interpolate(request.awsv4config.profileName) || '';
  }

  if (request) return request;
};

module.exports = interpolateVars;
