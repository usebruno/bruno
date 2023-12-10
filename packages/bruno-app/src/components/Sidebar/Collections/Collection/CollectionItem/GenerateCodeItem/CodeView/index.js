import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';
import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';
import { forOwn } from 'lodash';
import Handlebars from 'handlebars';

const CodeView = ({ language, item, envVars, collectionVariables }) => {
  const { storedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { target, client, language: lang } = language;
  let headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  envVars = cloneDeep(envVars);
  collectionVariables = cloneDeep(collectionVariables);
  headers = cloneDeep(headers);

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

  const interpolateString = (str, envVariables = {}, collectionVariables = {}, processEnvVars = {}) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    // envVariables can, in turn, have values as {{process.env.VAR_NAME}}
    // Therefore, we need to interpolate envVariables first with processEnvVars
    forOwn(envVariables, (value, key) => {
      envVariables[key] = interpolateEnvVars(value, processEnvVars);
    });

    const template = Handlebars.compile(str, { noEscape: true });

    // collectionVariables take precedence over envVariables
    const combinedVars = {
      ...envVariables,
      ...collectionVariables,
      process: {
        env: {
          ...processEnvVars
        }
      }
    };

    return template(combinedVars);
  };

  const auth =
    get(item, 'draft.request.auth') !== undefined ? get(item, 'draft.request.auth') : get(item, 'request.auth');

  if (auth.mode === 'bearer') {
    headers.push({
      name: 'Authorization',
      value: 'Bearer ' + auth.bearer.token,
      enabled: true,
      uid: uuid()
    });
  }

  for (let i = 0; i < headers.length; i++) {
    let headerValue = headers[i].value;

    // Look for variables {{  }}
    let matches = headerValue.match(/{{(.*?)}}/);

    if (matches) {
      headers[i].value = interpolateString(
        headerValue,
        envVars,
        collectionVariables,
        item.collection.processEnvVariables
      );
    }
  }

  let snippet = '';

  try {
    snippet = new HTTPSnippet(buildHarRequest({ request: item.request, headers })).convert(target, client);
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <CodeEditor
      readOnly
      value={snippet}
      font={get(preferences, 'font.codeFont', 'default')}
      theme={storedTheme}
      mode={lang}
    />
  );
};

export default CodeView;
