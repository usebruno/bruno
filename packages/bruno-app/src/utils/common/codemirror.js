import get from 'lodash/get';
import isString from 'lodash/isString';

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
}

const pathFoundInVariables = (path, obj) => {
  const value = get(obj, path);
  return isString(value);
};

export const defineCodeMirrorBrunoVariablesMode = (variables, mode) => {
  CodeMirror.defineMode('brunovariables', function (config, parserConfig) {
    let variablesOverlay = {
      token: function (stream, state) {
        if (stream.match('{{', true)) {
          let ch;
          let word = '';
          while ((ch = stream.next()) != null) {
            if (ch == '}' && stream.next() == '}') {
              stream.eat('}');
              let found = pathFoundInVariables(word, variables);
              if (found) {
                return 'variable-valid random-' + (Math.random() + 1).toString(36).substring(9);
              } else {
                return 'variable-invalid random-' + (Math.random() + 1).toString(36).substring(9);
              }
              // Random classname added so adjacent variables are not rendered in the same SPAN by CodeMirror.
            }
            word += ch;
          }
        }
        while (stream.next() != null && !stream.match('{{', false)) {}
        return null;
      }
    };

    return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || mode), variablesOverlay);
  });
};
