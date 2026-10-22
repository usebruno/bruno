import os from 'node:os';
import fs from 'node:fs';
import {
  collectLocalScriptRefs,
  executeLocalScript,
  LocalScriptError,
  normalizeLocalScripts,
  resolveLocalScriptEnvVars
} from './local-scripts';

const node = `"${process.execPath}"`;
// /tmp is symlinked to /private/tmp on macOS, so compare against the real path.
const cwd = fs.realpathSync.native(os.tmpdir());

describe('normalizeLocalScripts', () => {
  it('returns an empty list when no scripts are configured', () => {
    expect(normalizeLocalScripts(undefined)).toEqual([]);
    expect(normalizeLocalScripts({})).toEqual([]);
    expect(normalizeLocalScripts({ commands: 'nope' })).toEqual([]);
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

describe('executeLocalScript', () => {
  it('runs the command through the shell with the collection cwd', async () => {
    const result = await executeLocalScript(
      { name: 'cwd', command: `${node} -e "process.stdout.write(process.cwd())"` },
      { cwd }
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(cwd);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('strips trailing newlines like shell command substitution', async () => {
    const result = await executeLocalScript(
      { name: 'newline', command: `${node} -e "console.log('token-123')"` },
      { cwd }
    );
    expect(result.stdout).toBe('token-123');
  });

  it('passes extra environment variables to the child', async () => {
    const result = await executeLocalScript(
      { name: 'env', command: `${node} -e "process.stdout.write(process.env.BRUNO_TEST_SECRET)"` },
      { cwd, env: { BRUNO_TEST_SECRET: 's3cr3t' } }
    );
    expect(result.stdout).toBe('s3cr3t');
  });

  it('captures stderr and rejects on non-zero exit', async () => {
    await expect(
      executeLocalScript({ name: 'fail', command: `${node} -e "process.stderr.write('boom');process.exit(2)"` }, { cwd })
    ).rejects.toMatchObject({
      name: 'LocalScriptError',
      scriptName: 'fail',
      exitCode: 2,
      stderr: 'boom'
    });
  });

  it('rejects with a timeout error and kills the process tree', async () => {
    const started = Date.now();
    await expect(
      executeLocalScript(
        { name: 'slow', command: `${node} -e "setInterval(function(){},1000)"`, timeout: 100 },
        { cwd }
      )
    ).rejects.toMatchObject({ name: 'LocalScriptError', timedOut: true });
    expect(Date.now() - started).toBeLessThan(2000);
  }, 5000);
});

describe('collectLocalScriptRefs', () => {
  it('finds distinct refs inside nested values', () => {
    const refs = collectLocalScriptRefs({
      a: '{{$script:get-token}}',
      b: 'Bearer {{$script:get-token}} {{$script:other}}',
      c: ['{{$script:nested}}'],
      d: 42,
      e: '{{not-a-script}}'
    });
    expect(refs.sort()).toEqual(['get-token', 'nested', 'other']);
  });
});

describe('resolveLocalScriptEnvVars', () => {
  const config = {
    commands: [
      { name: 'token', command: `${node} -e "process.stdout.write('jwt-abc')"` },
      { name: 'whoami', command: `${node} -e "process.stdout.write(process.env.USER_REF)"` }
    ]
  };

  it('runs each referenced script once and substitutes all occurrences', async () => {
    const { envVars, results } = await resolveLocalScriptEnvVars(
      {
        jwt: '{{$script:token}}',
        authHeader: 'Bearer {{$script:token}}',
        plain: 'untouched',
        nested: '{{indirect}}',
        indirect: '{{$script:token}}'
      },
      config,
      { cwd }
    );
    expect(results).toHaveLength(1);
    expect(envVars.jwt).toBe('jwt-abc');
    expect(envVars.authHeader).toBe('Bearer jwt-abc');
    expect(envVars.plain).toBe('untouched');
    expect(envVars.nested).toBe('{{indirect}}');
    expect(envVars.indirect).toBe('jwt-abc');
  });

  it('passes bruno environment variables to the referenced command', async () => {
    const { envVars } = await resolveLocalScriptEnvVars(
      { USER_REF: 'alice', dynamic: '{{$script:whoami}}' },
      config,
      { cwd }
    );
    expect(envVars.dynamic).toBe('alice');
  });

  it('does not run anything when there are no references', async () => {
    const { envVars, results } = await resolveLocalScriptEnvVars({ a: '{{b}}' }, config, { cwd });
    expect(results).toEqual([]);
    expect(envVars).toEqual({ a: '{{b}}' });
  });

  it('rejects when a referenced script is not registered', async () => {
    await expect(
      resolveLocalScriptEnvVars({ a: '{{$script:missing}}' }, config, { cwd })
    ).rejects.toThrow('not registered');
  });

  it('returns a copy and leaves the input env vars untouched', async () => {
    const input = { jwt: '{{$script:token}}' };
    const { envVars } = await resolveLocalScriptEnvVars(input, config, { cwd });
    expect(envVars.jwt).toBe('jwt-abc');
    expect(input.jwt).toBe('{{$script:token}}');
  });

  it('runs scripts referenced directly in the request and returns interpolation variables', async () => {
    const request = {
      url: 'https://api.example.com/login?next={{$script:token}}',
      headers: { Authorization: 'Bearer {{$script:token}}' },
      data: { refresh: '{{$script:token}}' }
    };
    const { envVars, scriptVariables, results } = await resolveLocalScriptEnvVars(
      { unrelated: 'v' },
      config,
      { cwd },
      request
    );
    expect(results).toHaveLength(1);
    expect(scriptVariables).toEqual({ '$script:token': 'jwt-abc' });
    expect(envVars).toEqual({ unrelated: 'v' });
  });

  it('runs a script once when referenced from both env vars and the request', async () => {
    const { scriptVariables, results } = await resolveLocalScriptEnvVars(
      { jwt: '{{$script:token}}' },
      config,
      { cwd },
      { headers: { Authorization: 'Bearer {{$script:token}}' } }
    );
    expect(results).toHaveLength(1);
    expect(scriptVariables).toEqual({ '$script:token': 'jwt-abc' });
  });

  it('rejects when the request references an unregistered script', async () => {
    await expect(
      resolveLocalScriptEnvVars({}, config, { cwd }, { headers: { x: '{{$script:nope}}' } })
    ).rejects.toThrow('not registered');
  });

  it('does not leak injected script variables into the child process environment', async () => {
    const childConfig = {
      commands: [{ name: 'whoami', command: `${node} -e "process.stdout.write(process.env['\\$script:token'] || 'absent')"` }]
    };
    const envVars = { '$script:token': 'jwt-abc', 'dynamic': '{{$script:whoami}}' };
    const { envVars: resolved } = await resolveLocalScriptEnvVars(envVars, childConfig, { cwd });
    expect(resolved.dynamic).toBe('absent');
  });

  it('ignores non-plain values like binary buffers in the request', async () => {
    const request = {
      headers: { Authorization: 'Bearer {{$script:token}}' },
      data: Buffer.from([0x00, 0x01, 0x02, 0x80, 0xff])
    };
    const { scriptVariables } = await resolveLocalScriptEnvVars({}, config, { cwd }, request);
    expect(scriptVariables).toEqual({ '$script:token': 'jwt-abc' });
  });
});
