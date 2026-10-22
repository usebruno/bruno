import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadGlobalLocalScriptsConfig,
  saveGlobalLocalScriptsConfig,
  getGlobalLocalScriptsFilePath,
  GLOBAL_LOCAL_SCRIPTS_FILE_ENV
} from './local-scripts-store';
import { mergeLocalScriptsConfigs, LocalScriptError } from './local-scripts';

describe('global local scripts registry file', () => {
  let dir;

  beforeEach(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-local-scripts-')));
    delete process.env[GLOBAL_LOCAL_SCRIPTS_FILE_ENV];
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const filePath = () => path.join(dir, 'local-scripts.json');

  it('treats a missing file as an empty registry', () => {
    expect(loadGlobalLocalScriptsConfig({ filePath: filePath() })).toEqual({ commands: [] });
  });

  it('round-trips saved commands and normalizes them', () => {
    const saved = saveGlobalLocalScriptsConfig(
      { commands: [{ name: 'get-jwt', command: 'node get-jwt.js', timeout: 5000 }] },
      { filePath: filePath() }
    );
    expect(saved).toEqual({ commands: [{ name: 'get-jwt', command: 'node get-jwt.js', timeout: 5000 }] });
    expect(loadGlobalLocalScriptsConfig({ filePath: filePath() })).toEqual({
      commands: [{ name: 'get-jwt', command: 'node get-jwt.js', timeout: 5000 }]
    });
  });

  it('creates the parent directory and writes the file owner-only', () => {
    const nested = path.join(dir, 'nested', 'local-scripts.json');
    saveGlobalLocalScriptsConfig({ commands: [] }, { filePath: nested });
    expect(fs.existsSync(nested)).toBe(true);
    const mode = fs.statSync(nested).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('honors the BRUNO_LOCAL_SCRIPTS_FILE environment override', () => {
    process.env[GLOBAL_LOCAL_SCRIPTS_FILE_ENV] = filePath();
    expect(getGlobalLocalScriptsFilePath()).toBe(filePath());
    saveGlobalLocalScriptsConfig({ commands: [{ name: 'env-located', command: 'echo x' }] });
    expect(loadGlobalLocalScriptsConfig().commands).toEqual([{ name: 'env-located', command: 'echo x' }]);
  });

  it('rejects malformed JSON with the file path in the error', () => {
    fs.writeFileSync(filePath(), '{ not json');
    expect(() => loadGlobalLocalScriptsConfig({ filePath: filePath() })).toThrow(LocalScriptError);
    expect(() => loadGlobalLocalScriptsConfig({ filePath: filePath() })).toThrow(/not valid JSON/);
  });

  it('rejects invalid commands on save', () => {
    expect(() =>
      saveGlobalLocalScriptsConfig({ commands: [{ name: 'bad name', command: 'echo x' }] }, { filePath: filePath() })
    ).toThrow(LocalScriptError);
    expect(fs.existsSync(filePath())).toBe(false);
  });

  it('deduplicates on save with last entry winning', () => {
    const saved = saveGlobalLocalScriptsConfig(
      { commands: [
        { name: 'token', command: 'echo one' },
        { name: 'token', command: 'echo two' }
      ] },
      { filePath: filePath() }
    );
    expect(saved.commands).toEqual([{ name: 'token', command: 'echo two' }]);
  });
});

describe('mergeLocalScriptsConfigs', () => {
  it('combines global and collection-level commands with collection overriding on name clash', () => {
    const merged = mergeLocalScriptsConfigs(
      { commands: [
        { name: 'global-only', command: 'echo g' },
        { name: 'shared', command: 'echo global' }
      ] },
      { commands: [{ name: 'shared', command: 'echo collection' }] },
      null
    );
    expect(merged.commands).toEqual([
      { name: 'global-only', command: 'echo g' },
      { name: 'shared', command: 'echo collection' }
    ]);
  });
});
