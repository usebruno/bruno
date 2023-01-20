
let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
}

export const defineCodeMirrorBrunoVariablesMode = (variables, mode) => {
  CodeMirror.defineMode("brunovariables", function(config, parserConfig) {
    let variablesOverlay = {
      token: function(stream, state) {
        if (stream.match("{{", true)) {
          let ch;
          let word = "";
          while ((ch = stream.next()) != null) {
            if (ch == "}" && stream.next() == "}") {
              stream.eat("}");
              if (word in variables) {
                return "variable-valid";
              } else {
                return "variable-invalid";
              }
            }
            word += ch;
          }
        }
        while (stream.next() != null && !stream.match("{{", false)) {}
        return null;
      }
    };

    return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || mode), variablesOverlay);
  });
};