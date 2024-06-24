import get from 'lodash/get';

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
}

const pathFoundInVariables = (path, obj) => {
  const value = get(obj, path);
  return value !== undefined;
};

export const defineCodeMirrorBrunoVariablesMode = (_variables, mode, highlightPathParams) => {
  CodeMirror.defineMode('brunovariables', function (config, parserConfig) {
    const { pathParams = {}, ...variables } = _variables || {};
    const variablesOverlay = {
      token: function (stream) {
        if (stream.match('{{', true)) {
          let ch;
          let word = '';
          while ((ch = stream.next()) != null) {
            if (ch === '}' && stream.peek() === '}') {
              stream.eat('}');
              const found = pathFoundInVariables(word, variables);
              const status = found ? 'valid' : 'invalid';
              const randomClass = `random-${(Math.random() + 1).toString(36).substring(9)}`;
              return `variable-${status} ${randomClass}`;
            }
            word += ch;
          }
        }
        stream.skipTo('{{') || stream.skipToEnd();
        return null;
      }
    };

    const urlPathParamsOverlay = {
      token: function (stream) {
        if (stream.match('/:', true)) {
          let ch;
          let word = '';
          while ((ch = stream.next()) != null) {
            if (ch === '/' || ch === '?' || ch === '&' || ch === '=') {
              stream.backUp(1);
              const found = pathFoundInVariables(word, pathParams);
              const status = found ? 'valid' : 'invalid';
              const randomClass = `random-${(Math.random() + 1).toString(36).substring(9)}`;
              return `variable-${status} ${randomClass}`;
            }
            word += ch;
          }

          // If we've consumed all characters and the word is not empty, it might be a path parameter at the end of the URL.
          if (word) {
            const found = pathFoundInVariables(word, pathParams);
            const status = found ? 'valid' : 'invalid';
            const randomClass = `random-${(Math.random() + 1).toString(36).substring(9)}`;
            return `variable-${status} ${randomClass}`;
          }
        }
        stream.skipTo('/:') || stream.skipToEnd();
        return null;
      }
    };

    let baseMode = CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || mode), variablesOverlay);

    if (highlightPathParams) {
      return CodeMirror.overlayMode(baseMode, urlPathParamsOverlay);
    } else {
      return baseMode;
    }
  });
};

export const getCodeMirrorModeBasedOnContentType = (contentType, body) => {
  if (typeof body === 'object') {
    return 'application/ld+json';
  }
  if (!contentType || typeof contentType !== 'string') {
    return 'application/text';
  }

  if (contentType.includes('json')) {
    return 'application/ld+json';
  } else if (contentType.includes('xml')) {
    return 'application/xml';
  } else if (contentType.includes('html')) {
    return 'application/html';
  } else if (contentType.includes('text')) {
    return 'application/text';
  } else if (contentType.includes('application/edn')) {
    return 'application/xml';
  } else if (contentType.includes('yaml')) {
    return 'application/yaml';
  } else if (contentType.includes('image')) {
    return 'application/image';
  } else {
    return 'application/text';
  }
};
