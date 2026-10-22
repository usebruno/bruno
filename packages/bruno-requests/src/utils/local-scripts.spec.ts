import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {
  collectLocalScriptRefs,
  executeLocalScript,
  mergeLocalScriptOutputs,
  normalizeLocalScripts,
  resolveLocalScriptVariables
} from './local-scripts';

const node = `"${process.execPath}"`;
// /tmp is symlinked to /private/tmp on macOS, so compare against the real path.
const cwd = fs.realpathSync.native(os.tmpdir());

describe('normalizeLocalScripts (smoke — full coverage in @usebruno/common)', () => {
  it('normalizes a valid list through the re-export', () => {
    expect(normalizeLocalScripts({ commands: [{ name: 'a', command: 'echo x' }] })).toEqual([
      { name: 'a', command: 'echo x' }
    ]);
  });
});

describe('executeLocalScript', () => {
  it('runs the command through the shell with the given cwd', async () => {
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

  it('ignores collection-supplied values for interpreter-controlling env keys', async () => {
    const result = await executeLocalScript(
      { name: 'protected', command: `${node} -e "process.stdout.write(process.env.PATH || '')"` },
      { cwd, env: { PATH: '/nonexistent-collection-path', node_options: '--no-warnings' } }
    );
    expect(result.stdout).toBe(process.env.PATH || '');
  });

  it('rejects immediately when the abort signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      executeLocalScript(
        { name: 'cancelled', command: `${node} -e "setInterval(function(){},1000)"` },
        { cwd, signal: controller.signal }
      )
    ).rejects.toMatchObject({ name: 'LocalScriptError', scriptName: 'cancelled' });
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

describe('resolveLocalScriptVariables', () => {
  const globalConfig = {
    commands: [
      { name: 'token', command: `${node} -e "process.stdout.write('jwt-abc')"` },
      { name: 'whoami', command: `${node} -e "process.stdout.write(process.env.USER_REF)"` }
    ]
  };

  const resolve = (envVars, referencedNames, extra = {}) =>
    resolveLocalScriptVariables({
      envVars,
      referencedNames,
      scriptsConfigs: [globalConfig],
      context: { cwd },
      ...extra
    });

  it('runs each referenced script once and substitutes all occurrences in env values', async () => {
    const counter = path.join(cwd, `bruno-ls-${process.pid}-${Date.now()}.log`);
    const countingConfig = {
      commands: [
        {
          name: 'token',
          command: `${node} -e "require('fs').appendFileSync(process.env.LS_COUNTER,'1');process.stdout.write('jwt-abc')"`
        }
      ]
    };
    const { envVars, scriptVariables } = await resolveLocalScriptVariables({
      envVars: {
        jwt: '{{$script:token}}',
        authHeader: 'Bearer {{$script:token}}',
        plain: 'untouched',
        nested: '{{indirect}}',
        indirect: '{{$script:token}}'
      },
      referencedNames: ['token'],
      scriptsConfigs: [countingConfig],
      context: { cwd, env: { LS_COUNTER: counter } }
    });

    expect(scriptVariables).toEqual({ '$script:token': 'jwt-abc' });
    expect(envVars.jwt).toBe('jwt-abc');
    expect(envVars.authHeader).toBe('Bearer jwt-abc');
    expect(envVars.plain).toBe('untouched');
    expect(envVars.nested).toBe('{{indirect}}');
    expect(envVars.indirect).toBe('jwt-abc');
    // Referenced from three values, but the command runs exactly once.
    expect(fs.readFileSync(counter, 'utf8')).toBe('1');
    fs.unlinkSync(counter);
  });

  it('passes bruno environment variables to the referenced command', async () => {
    const { envVars } = await resolve({ USER_REF: 'alice', dynamic: '{{$script:whoami}}' }, ['whoami']);
    expect(envVars.dynamic).toBe('alice');
  });

  it('returns a copy and leaves the input env vars untouched', async () => {
    const input = { jwt: '{{$script:token}}' };
    const { envVars } = await resolve(input, ['token']);
    expect(envVars.jwt).toBe('jwt-abc');
    expect(input.jwt).toBe('{{$script:token}}');
  });

  it('returns interpolation variables for scripts referenced directly in the request', async () => {
    // The runtime hook scans the request itself and passes the names in; the
    // resolver only needs those names to produce the interpolation variables.
    const { envVars, scriptVariables } = await resolveLocalScriptVariables({
      envVars: { unrelated: 'v' },
      referencedNames: collectLocalScriptRefs({
        url: 'https://api.example.com/login?next={{$script:token}}',
        headers: { Authorization: 'Bearer {{$script:token}}' },
        data: { refresh: '{{$script:token}}' }
      }),
      scriptsConfigs: [globalConfig],
      context: { cwd }
    });
    expect(scriptVariables).toEqual({ '$script:token': 'jwt-abc' });
    expect(envVars).toEqual({ unrelated: 'v' });
  });

  it('rejects when a referenced script is not registered', async () => {
    await expect(resolve({ a: '{{$script:missing}}' }, ['missing'])).rejects.toThrow('not registered');
  });

  it('does not leak injected script variables into the child process environment', async () => {
    const childConfig = {
      commands: [{ name: 'whoami', command: `${node} -e "process.stdout.write(process.env['\\$script:token'] || 'absent')"` }]
    };
    const { envVars } = await resolveLocalScriptVariables({
      envVars: { '$script:token': 'jwt-abc', 'dynamic': '{{$script:whoami}}' },
      referencedNames: ['whoami'],
      scriptsConfigs: [childConfig],
      context: { cwd }
    });
    expect(envVars.dynamic).toBe('absent');
  });

  it('merges registries in order, with the collection config overriding the global one', async () => {
    const collectionConfig = {
      commands: [{ name: 'token', command: `${node} -e "process.stdout.write('collection-wins')"` }]
    };
    const { scriptVariables } = await resolveLocalScriptVariables({
      envVars: {},
      referencedNames: ['token'],
      scriptsConfigs: [globalConfig, collectionConfig],
      context: { cwd }
    });
    expect(scriptVariables['$script:token']).toBe('collection-wins');
  });
});

describe('mergeLocalScriptOutputs', () => {
  it('adds injected keys and substituted env values, then rolls them back', () => {
    const envVars = { jwt: '{{$script:token}}', plain: 'untouched' };
    const resolved = { jwt: 'jwt-abc', plain: 'untouched' };
    const scriptVariables = { '$script:token': 'jwt-abc' };

    const rollback = mergeLocalScriptOutputs(envVars, resolved, scriptVariables);
    expect(envVars).toEqual({ 'jwt': 'jwt-abc', 'plain': 'untouched', '$script:token': 'jwt-abc' });

    rollback();
    expect(envVars).toEqual({ jwt: '{{$script:token}}', plain: 'untouched' });
  });

  it('keeps an explicit in-request override of a substituted env value', () => {
    const envVars = { jwt: '{{$script:token}}' };
    const resolved = { jwt: 'jwt-abc' };

    const rollback = mergeLocalScriptOutputs(envVars, resolved, {});
    envVars.jwt = 'script-override';
    rollback();
    expect(envVars.jwt).toBe('script-override');
  });
});
