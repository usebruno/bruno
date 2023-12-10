import Modal from 'components/Modal/index';
import { useState } from 'react';
import CodeView from './CodeView';
import StyledWrapper from './StyledWrapper';
import { isValidUrl } from 'utils/url/index';
import get from 'lodash/get';
import Handlebars from 'handlebars';
import { findEnvironmentInCollection } from 'utils/collections';
import { each, forOwn, cloneDeep } from 'lodash';

const languages = [
  {
    name: 'HTTP',
    target: 'http',
    client: 'http1.1'
  },
  {
    name: 'JavaScript-Fetch',
    target: 'javascript',
    client: 'fetch'
  },
  {
    name: 'Javascript-jQuery',
    target: 'javascript',
    client: 'jquery'
  },
  {
    name: 'Javascript-axios',
    target: 'javascript',
    client: 'axios'
  },
  {
    name: 'Python-Python3',
    target: 'python',
    client: 'python3'
  },
  {
    name: 'Python-Requests',
    target: 'python',
    client: 'requests'
  },
  {
    name: 'PHP',
    target: 'php',
    client: 'curl'
  },
  {
    name: 'Shell-curl',
    target: 'shell',
    client: 'curl'
  },
  {
    name: 'Shell-httpie',
    target: 'shell',
    client: 'httpie'
  }
];

const GenerateCodeItem = ({ collection, item, onClose }) => {
  let request = get(item, 'draft.request') !== undefined ? get(item, 'draft.request') : get(item, 'request');
  request = cloneDeep(request);
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  const collectionVariables = cloneDeep(collection.collectionVariables);

  let envVars = {};
  if (environment) {
    const vars = get(environment, 'variables', []);
    envVars = vars.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {});
  }

  const getContentType = (headers = {}) => {
    let contentType = '';
    forOwn(headers, (value, key) => {
      if (key && key.toLowerCase() === 'content-type') {
        contentType = value;
      }
    });

    return contentType;
  };
  const interpolateCollectionVars = (str, processEnvVars, processCollectionVariables) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const template = Handlebars.compile(str, { noEscape: true });

    const output = template({
      ...processEnvVars,
      ...processCollectionVariables,
      process: {
        env: {
          ...processCollectionVariables
        }
      }
    });

    // Check if returned string has any more variables to interpolate
    if (output.includes('{{') && output.includes('}}')) {
      return interpolateCollectionVars(output, processEnvVars, processCollectionVariables);
    }

    return output;
  };

  const interpolateVars = (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
    // we clone envVars because we don't want to modify the original object
    envVars = cloneDeep(envVars);
    collectionVariables = cloneDeep(collectionVariables);

    // envVariables can, in turn, have values as {{process.env.VAR_NAME}}
    // Therefore, we need to interpolate envVariables first with processEnvVars
    forOwn(envVars, (value, key) => {
      envVars[key] = interpolateEnvVars(value, processEnvVars);
    });

    Object.entries(collectionVariables).map(([key, value]) => {
      collectionVariables[key] = interpolateCollectionVars(value, envVars, collectionVariables);
    });

    const encodeURI = (str) => {
      // Create a URL object from the string
      let url = new URL(str);

      // Get the search params object for easy parsing
      let searchParams = url.searchParams;

      // Encode each parameter
      for (let [key, value] of searchParams) {
        searchParams.set(key, encodeURIComponent(value));
      }

      // Replace the search string in the original url with the properly encoded one
      url.search = searchParams.toString();

      return url.href;
    };
    const interpolate = (str) => {
      if (!str || !str.length || typeof str !== 'string') {
        return str;
      }

      // Handlebars doesn't allow dots as identifiers, so we need to use literal segments
      const strLiteralSegment = str.replace('{{', '{{[').replace('}}', ']}}');
      const template = Handlebars.compile(strLiteralSegment, { noEscape: true });

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

      const output = template(combinedVars);

      // Check if returned string has any more variables to interpolate
      if (output.includes('{{') && output.includes('}}')) {
        return interpolate(output);
      }

      return output;
    };

    request.url = encodeURI(interpolate(request.url));

    forOwn(request.headers, (value, key) => {
      delete request.headers[key];
      request.headers[interpolate(key)] = interpolate(value);
    });

    each(request.params, (param) => {
      param.name = interpolate(param.name);
      param.value = interpolate(param.value);
    });

    const contentType = getContentType(request.headers);

    if (contentType.includes('json')) {
      if (typeof request.data === 'object') {
        try {
          let parsed = JSON.stringify(request.data);
          parsed = interpolate(parsed);
          request.data = JSON.parse(parsed);
        } catch (err) {}
      }

      if (typeof request.data === 'string') {
        if (request.data.length) {
          request.data = interpolate(request.data);
        }
      }
    } else if (contentType === 'application/x-www-form-urlencoded') {
      if (typeof request.data === 'object') {
        try {
          let parsed = JSON.stringify(request.data);
          parsed = interpolate(parsed);
          request.data = JSON.parse(parsed);
        } catch (err) {}
      }
    } else {
      request.data = interpolate(request.data);
    }

    if (request.proxy) {
      request.proxy.protocol = interpolate(request.proxy.protocol);
      request.proxy.hostname = interpolate(request.proxy.hostname);
      request.proxy.port = interpolate(request.proxy.port);

      if (request.proxy.auth) {
        request.proxy.auth.username = interpolate(request.proxy.auth.username);
        request.proxy.auth.password = interpolate(request.proxy.auth.password);
      }
    }

    // todo: we have things happening in two places w.r.t basic auth
    //       need to refactor this in the future
    // the request.auth (basic auth) object gets set inside the prepare-request.js file
    if (request.auth && request.auth.mode === undefined) {
      const username = interpolate(request.auth.username) || '';
      const password = interpolate(request.auth.password) || '';

      // use auth header based approach and delete the request.auth object
      request.headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      delete request.auth;
    }

    // interpolate vars for aws sigv4 auth
    if (request.awsv4config) {
      request.awsv4config.accessKeyId = interpolate(request.awsv4config.accessKeyId) || '';
      request.awsv4config.secretAccessKey = interpolate(request.awsv4config.secretAccessKey) || '';
      request.awsv4config.sessionToken = interpolate(request.awsv4config.sessionToken) || '';
      request.awsv4config.service = interpolate(request.awsv4config.service) || '';
      request.awsv4config.region = interpolate(request.awsv4config.region) || '';
      request.awsv4config.profileName = interpolate(request.awsv4config.profileName) || '';
    }

    // interpolate vars for digest auth
    if (request.digestConfig) {
      request.digestConfig.username = interpolate(request.digestConfig.username) || '';
      request.digestConfig.password = interpolate(request.digestConfig.password) || '';
    }

    return request;
  };

  const interpolatedRequest = interpolateVars(request, envVars, collectionVariables, collection.processEnvVariables);

  let interpolatedUrl = interpolatedRequest.url;

  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  return (
    <Modal size="lg" title="Generate Code" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="flex w-full">
          <div>
            <div className="generate-code-sidebar">
              {languages &&
                languages.length &&
                languages.map((language) => (
                  <div
                    key={language.name}
                    className={
                      language.name === selectedLanguage.name ? 'generate-code-item active' : 'generate-code-item'
                    }
                    onClick={() => setSelectedLanguage(language)}
                  >
                    <span className="capitalize">{language.name}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-grow p-4">
            {isValidUrl(interpolatedUrl) ? (
              <CodeView
                language={selectedLanguage}
                envVars={envVars}
                collectionVariables={collectionVariables}
                item={{
                  collection,
                  ...item,
                  request: {
                    ...request,
                    url: interpolatedUrl
                  }
                }}
              />
            ) : (
              <div className="flex flex-col justify-center items-center w-full">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Invalid URL: {interpolatedUrl}</h1>
                  <p className="text-gray-500">Please check the URL and try again</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateCodeItem;
