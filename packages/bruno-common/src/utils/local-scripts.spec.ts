import {
  LOCAL_SCRIPT_NAME_PATTERN,
  LocalScriptError,
  normalizeLocalScripts,
  mergeLocalScriptsConfigs
} from './local-scripts';

describe('normalizeLocalScripts', () => {
  it('returns an empty list when no scripts are configured', () => {
    expect(normalizeLocalScripts(undefined)).toEqual([]);
    expect(normalizeLocalScripts({})).toEqual([]);
    expect(normalizeLocalScripts({ commands: 'nope' })).toEqual([]);
    expect(normalizeLocalScripts(null)).toEqual([]);
  });

  it('keeps valid entries and fills no defaults onto the object', () => {
    const scripts = normalizeLocalScripts({
      commands: [{ name: 'get-token', command: 'node token.js' }]
    });
    expect(scripts).toEqual([{ name: 'get-token', command: 'node token.js' }]);
  });

  it('rejects invalid names, empty commands and bad timeouts', () => {
    expect(() => normalizeLocalScripts({ commands: [{ name: 'bad name', command: 'echo x' }] })).toThrow(LocalScriptError);
    expect(() => normalizeLocalScripts({ commands: [{ name: 'ok', command: '' }] })).toThrow(LocalScriptError);
    expect(() => normalizeLocalScripts({ commands: [{ name: 'ok', command: 'echo x', timeout: -1 }] })).toThrow(LocalScriptError);
  });

  it('exposes the accepted name character set through the pattern', () => {
    expect(LOCAL_SCRIPT_NAME_PATTERN.test('get-token_1.x')).toBe(true);
    expect(LOCAL_SCRIPT_NAME_PATTERN.test('a/b')).toBe(false);
    expect(LOCAL_SCRIPT_NAME_PATTERN.test('1abc')).toBe(true);
  });

  it('last entry wins for duplicate names', () => {
    const scripts = normalizeLocalScripts({
      commands: [
        { name: 'token', command: 'echo one' },
        { name: 'token', command: 'echo two' }
      ]
    });
    expect(scripts).toHaveLength(1);
    expect(scripts[0].command).toBe('echo two');
  });
});

describe('mergeLocalScriptsConfigs', () => {
  it('merges registries in order with later entries winning', () => {
    const merged = mergeLocalScriptsConfigs(
      { commands: [
        { name: 'global-only', command: 'echo g' },
        { name: 'shared', command: 'echo global' }
      ] },
      null,
      { commands: [{ name: 'shared', command: 'echo collection' }] }
    );
    expect(merged.commands).toEqual([
      { name: 'global-only', command: 'echo g' },
      { name: 'shared', command: 'echo collection' }
    ]);
  });

  it('validates every merged registry', () => {
    expect(() =>
      mergeLocalScriptsConfigs({ commands: [{ name: 'bad name', command: 'echo x' }] })
    ).toThrow(LocalScriptError);
  });
});
