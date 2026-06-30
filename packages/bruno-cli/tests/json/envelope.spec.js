const { describe, it, expect } = require('@jest/globals');
const { Writable } = require('stream');
const { createWriter, buildErrorPayload } = require('../../src/json/envelope');
const { JSON_CONTRACT_VERSION, negotiateVersion, isSupportedVersion } = require('../../src/json/version');
const { nameForCode } = require('../../src/json/error-names');
const { EXIT_STATUS, CLI_VERSION } = require('../../src/constants');

const collect = () => {
  const chunks = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    }
  });
  return {
    stream,
    lines: () => chunks.join('').split('\n').filter(Boolean),
    json: () => chunks.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  };
};

describe('json/version', () => {
  it('negotiates the default version when none is requested', () => {
    expect(negotiateVersion(undefined)).toBe(JSON_CONTRACT_VERSION);
    expect(negotiateVersion(null)).toBe(JSON_CONTRACT_VERSION);
    expect(negotiateVersion('')).toBe(JSON_CONTRACT_VERSION);
  });

  it('accepts a supported version string or number', () => {
    expect(negotiateVersion(1)).toBe(1);
    expect(negotiateVersion('1')).toBe(1);
  });

  it('returns null for unsupported or malformed versions', () => {
    expect(negotiateVersion(2)).toBeNull();
    expect(negotiateVersion('abc')).toBeNull();
    expect(negotiateVersion(1.5)).toBeNull();
    expect(isSupportedVersion(99)).toBe(false);
  });
});

describe('json/error-names', () => {
  it('maps every EXIT_STATUS code to a stable slug', () => {
    for (const code of Object.values(EXIT_STATUS)) {
      const name = nameForCode(code);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('falls back to internal_error for unknown codes', () => {
    expect(nameForCode(9999)).toBe('internal_error');
  });
});

describe('json/envelope writer', () => {
  it('is disabled by default and emits nothing on stdout/stderr', () => {
    const out = collect();
    const err = collect();
    const w = createWriter({ stdout: out.stream, stderr: err.stream });

    w.writeEnvelope({ kind: 'run.start', data: { hello: 'world' } });
    w.writeError({ code: EXIT_STATUS.ERROR_ENV_NOT_FOUND, message: 'nope' });

    expect(w.enabled).toBe(false);
    expect(out.lines()).toEqual([]);
    expect(err.lines()).toEqual([]);
  });

  it('writes a versioned envelope to stdout when enabled', () => {
    const out = collect();
    const w = createWriter({ json: true, stdout: out.stream, stderr: collect().stream });

    w.writeEnvelope({ kind: 'run.start', data: { total: 3 } });

    const [line] = out.json();
    expect(line).toEqual({
      version: JSON_CONTRACT_VERSION,
      kind: 'run.start',
      ok: true,
      data: { total: 3 },
      meta: { cli_version: CLI_VERSION }
    });
  });

  it('treats writeEvent as an alias of writeEnvelope', () => {
    const out = collect();
    const w = createWriter({ json: true, stdout: out.stream });
    w.writeEvent({ kind: 'request.start', data: { path: 'a.bru' } });
    expect(w.writeEvent).toBe(w.writeEnvelope);
    expect(out.json()).toHaveLength(1);
    expect(out.json()[0].kind).toBe('request.start');
  });

  it('writes errors to stderr with the canonical name + code mapping', () => {
    const err = collect();
    const w = createWriter({ json: true, stdout: collect().stream, stderr: err.stream });

    w.writeError({
      code: EXIT_STATUS.ERROR_ENV_NOT_FOUND,
      message: 'Environment "Prod" not found',
      hint: 'Check environments/ directory',
      details: { name: 'Prod' }
    });

    expect(err.json()[0]).toEqual({
      version: JSON_CONTRACT_VERSION,
      kind: 'error',
      ok: false,
      error: {
        code: EXIT_STATUS.ERROR_ENV_NOT_FOUND,
        name: 'env_not_found',
        message: 'Environment "Prod" not found',
        hint: 'Check environments/ directory',
        details: { name: 'Prod' }
      }
    });
  });

  it('omits optional fields when not provided', () => {
    const err = collect();
    const w = createWriter({ json: true, stderr: err.stream });
    w.writeError({ code: EXIT_STATUS.ERROR_FAILED_COLLECTION });
    const payload = err.json()[0];
    expect(payload.error).toEqual({
      code: EXIT_STATUS.ERROR_FAILED_COLLECTION,
      name: 'run_failed',
      message: 'run_failed'
    });
  });

  it('exitWithError exits with the provided code and writes envelope only when enabled', () => {
    const realExit = process.exit;
    const exits = [];
    process.exit = (code) => { exits.push(code); };
    try {
      // disabled writer: exit code only, no JSON
      const errDisabled = collect();
      const wDisabled = createWriter({ stderr: errDisabled.stream });
      wDisabled.exitWithError({ code: EXIT_STATUS.ERROR_FILE_NOT_FOUND, message: 'gone' });
      expect(exits).toEqual([EXIT_STATUS.ERROR_FILE_NOT_FOUND]);
      expect(errDisabled.lines()).toEqual([]);

      // enabled writer: exit code AND JSON envelope on stderr
      const errEnabled = collect();
      const wEnabled = createWriter({ json: true, stderr: errEnabled.stream });
      wEnabled.exitWithError({ code: EXIT_STATUS.ERROR_FILE_NOT_FOUND, message: 'gone' });
      expect(exits).toEqual([EXIT_STATUS.ERROR_FILE_NOT_FOUND, EXIT_STATUS.ERROR_FILE_NOT_FOUND]);
      expect(errEnabled.json()).toHaveLength(1);
      expect(errEnabled.json()[0].error.name).toBe('input_not_found');
    } finally {
      process.exit = realExit;
    }
  });

  it('exitWithError defaults to ERROR_GENERIC (255) when no code is given', () => {
    const realExit = process.exit;
    const exits = [];
    process.exit = (code) => { exits.push(code); };
    try {
      const w = createWriter({ json: true, stderr: collect().stream });
      w.exitWithError({ message: 'boom' });
      expect(exits).toEqual([EXIT_STATUS.ERROR_GENERIC]);
    } finally {
      process.exit = realExit;
    }
  });

  it('newline-terminates every emitted line', () => {
    const out = collect();
    const w = createWriter({ json: true, stdout: out.stream });
    w.writeEvent({ kind: 'a' });
    w.writeEvent({ kind: 'b' });
    const raw = out.lines();
    expect(raw).toHaveLength(2);
    expect(raw[0]).not.toContain('\n');
  });

  it('buildErrorPayload omits empty optional fields', () => {
    const payload = buildErrorPayload(JSON_CONTRACT_VERSION, { code: EXIT_STATUS.ERROR_FAILED_COLLECTION });
    expect(payload.error).toEqual({
      code: 1,
      name: 'run_failed',
      message: 'run_failed'
    });
    expect(payload.error.details).toBeUndefined();
    expect(payload.error.hint).toBeUndefined();
  });
});
