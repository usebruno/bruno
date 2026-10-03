import CodeMirror from 'codemirror';
import 'codemirror/addon/mode/overlay';
import { defineCodeMirrorBrunoVariablesMode } from './codemirror';

// Tokenizes `line` with the 'brunovariables' overlay mode and returns the
// CSS token type CodeMirror assigned to each character (undefined = untouched).
const tokenizeLine = (line, pathParams) => {
  defineCodeMirrorBrunoVariablesMode({ pathParams }, 'text/plain', true, true);
  const mode = CodeMirror.getMode({ indentUnit: 2 }, 'brunovariables');
  const stream = new CodeMirror.StringStream(line);
  const state = CodeMirror.startState(mode);
  const types = [];

  while (!stream.eol()) {
    stream.start = stream.pos;
    const start = stream.pos;
    const type = mode.token(stream, state);
    types.push({ text: line.slice(start, stream.pos), type });
  }

  return types;
};

describe('urlPathParamsOverlay (via brunovariables mode)', () => {
  it('highlights the full path param when there is no escaped colon', () => {
    const tokens = tokenizeLine('/:id', { id: '123' });

    expect(tokens).toEqual([
      { text: '/:id', type: expect.stringContaining('variable-valid') }
    ]);
  });

  it('only highlights the name before an escaped colon, leaving the literal suffix untouched', () => {
    const tokens = tokenizeLine('/:id\\:reactivate', { id: '123' });

    expect(tokens[0]).toEqual({
      text: '/:id',
      type: expect.stringContaining('variable-valid')
    });

    const suffix = tokens
      .slice(1)
      .map((t) => t.text)
      .join('');
    expect(suffix).toBe('\\:reactivate');
    tokens.slice(1).forEach((token) => expect(token.type).toBeFalsy());
  });

  it('marks an unresolved param name before the escaped colon as invalid', () => {
    const tokens = tokenizeLine('/:unknown\\:literal', { id: '123' });

    expect(tokens[0]).toEqual({
      text: '/:unknown',
      type: expect.stringContaining('variable-invalid')
    });
  });
});
