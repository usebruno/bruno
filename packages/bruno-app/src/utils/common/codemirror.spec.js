import CodeMirror from 'codemirror';
import { defineCodeMirrorBrunoVariablesMode } from './codemirror';

// Runs the Bruno variables overlay over a line and returns the CSS class (without the random suffix)
// of every highlighted token, in order.
const highlightVariables = (text, variables) => {
  // The overlay addon is not loaded in tests: return the overlay itself so its token function can be driven directly.
  const original = { defineMode: CodeMirror.defineMode, overlayMode: CodeMirror.overlayMode, getMode: CodeMirror.getMode };
  let modeFactory;
  CodeMirror.defineMode = (name, factory) => {
    modeFactory = factory;
  };
  CodeMirror.overlayMode = (base, overlay) => overlay;
  CodeMirror.getMode = () => ({});

  try {
    defineCodeMirrorBrunoVariablesMode(variables, 'text/plain', false, true);
    const overlay = modeFactory({}, {});

    const stream = new CodeMirror.StringStream(text);
    const tokens = [];
    while (!stream.eol()) {
      stream.start = stream.pos;
      const style = overlay.token(stream);
      if (style) {
        tokens.push({ text: stream.current(), style: style.split(' ')[0] });
      }
    }
    return tokens;
  } finally {
    Object.assign(CodeMirror, original);
  }
};

describe('defineCodeMirrorBrunoVariablesMode - variables overlay', () => {
  const variables = {
    host: 'api.example.com',
    user: { name: 'Bruno' }
  };

  it('marks defined variables as valid and undefined variables as invalid', () => {
    expect(highlightVariables('https://{{host}}/{{missing}}', variables)).toEqual([
      { text: '{{host}}', style: 'variable-valid' },
      { text: '{{missing}}', style: 'variable-invalid' }
    ]);
  });

  it('marks a variable with a default value as valid even when it is not defined', () => {
    expect(highlightVariables('{{missing:-localhost}}:{{port:-3000}}', variables)).toEqual([
      { text: '{{missing:-localhost}}', style: 'variable-valid' },
      { text: '{{port:-3000}}', style: 'variable-valid' }
    ]);
  });

  it('marks a defined dot-notation variable with a default value as valid', () => {
    expect(highlightVariables('{{user.name:-anonymous}}', variables)).toEqual([
      { text: '{{user.name:-anonymous}}', style: 'variable-valid' }
    ]);
  });

  it('does not treat a leading separator as a default value', () => {
    expect(highlightVariables('{{:-fallback}}', variables)).toEqual([
      { text: '{{:-fallback}}', style: 'variable-invalid' }
    ]);
  });
});
