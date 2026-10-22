import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {
  collectLocalScriptRefs,
  collectRequestLocalScriptRefs,
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

  it('ignores collection-supplied shell-startup env keys (BASH_ENV/ENV/ZDOTDIR)', async () => {
    const result = await executeLocalScript(
      { name: 'protected-startup', command: `${node} -e "process.stdout.write(process.env.BASH_ENV || 'absent')"` },
      { cwd, env: { BASH_ENV: '/tmp/evil-startup.sh', ENV: '/tmp/evil-env', zdotdir: '/tmp/evil-zsh' } }
    );
    expect(result.stdout).toBe(process.env.BASH_ENV || 'absent');
    expect(result.stdout).not.toBe('/tmp/evil-startup.sh');
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

describe('collectRequestLocalScriptRefs', () => {
  it('finds refs in interpolated request fields', () => {
    const refs = collectRequestLocalScriptRefs({
      url: 'https://example.com/?t={{$script:querytoken}}',
      headers: { Authorization: 'Bearer {{$script:headertoken}}' },
      data: { refresh: '{{$script:bodytoken}}' }
    });
    expect(refs.sort()).toEqual(['bodytoken', 'headertoken', 'querytoken']);
  });

  it('ignores refs inside pre/post-request and test script code', () => {
    const refs = collectRequestLocalScriptRefs({
      url: 'https://example.com/',
      headers: { Authorization: 'Bearer {{$script:realtoken}}' },
      script: {
        req: '// {{$script:codecomment}}\nbru.setEnvVar("x", "{{$script:codestring}}")',
        res: 'test("uses {{$script:codetest}}", () => {})'
      },
      tests: 'test("also code {{$script:testcode}}", () => {})'
    });
    expect(refs).toEqual(['realtoken']);
  });

  it('returns nothing for non-object input', () => {
    expect(collectRequestLocalScriptRefs(null)).toEqual([]);
    expect(collectRequestLocalScriptRefs(undefined)).toEqual([]);
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
  it('adds injected keys and substituted env values, then restores them', () => {
    const envVars = { jwt: '{{$script:token}}', plain: 'untouched' };
    const resolved = { jwt: 'jwt-abc', plain: 'untouched' };
    const scriptVariables = { '$script:token': 'jwt-abc' };

    const scope = mergeLocalScriptOutputs(envVars, resolved, scriptVariables);
    expect(envVars).toEqual({ 'jwt': 'jwt-abc', 'plain': 'untouched', '$script:token': 'jwt-abc' });

    scope.restore();
    expect(envVars).toEqual({ jwt: '{{$script:token}}', plain: 'untouched' });
  });

  it('keeps an explicit in-request override of a substituted env value', () => {
    const envVars = { jwt: '{{$script:token}}' };
    const resolved = { jwt: 'jwt-abc' };

    const scope = mergeLocalScriptOutputs(envVars, resolved, {});
    envVars.jwt = 'script-override';
    scope.restore();
    expect(envVars.jwt).toBe('script-override');
  });

  it('keeps an explicit override of a newly injected key', () => {
    const envVars = { plain: 'untouched' };
    const scope = mergeLocalScriptOutputs(envVars, {}, { '$script:token': 'jwt-abc' });
    envVars['$script:token'] = 'manual-override';
    scope.restore();
    expect(envVars['$script:token']).toBe('manual-override');
  });

  it('sanitize drops injected keys and restores templates without touching the live object', () => {
    const envVars = { jwt: '{{$script:token}}', plain: 'untouched' };
    const scope = mergeLocalScriptOutputs(envVars, { jwt: 'jwt-abc', plain: 'untouched' }, { '$script:token': 'jwt-abc' });

    // A cleanJson-style snapshot produced by the script runtime after the merge.
    const snapshot = { 'jwt': 'jwt-abc', 'plain': 'untouched', '$script:token': 'jwt-abc' };
    expect(scope.sanitize(snapshot)).toEqual({ jwt: '{{$script:token}}', plain: 'untouched' });
    // The snapshot and the live env are left intact.
    expect(snapshot).toEqual({ 'jwt': 'jwt-abc', 'plain': 'untouched', '$script:token': 'jwt-abc' });
    expect(envVars['$script:token']).toBe('jwt-abc');
  });

  it('sanitize preserves an explicit bru.setEnvVar override of a template-backed value', () => {
    const envVars = { jwt: '{{$script:token}}' };
    const scope = mergeLocalScriptOutputs(envVars, { jwt: 'jwt-abc' }, { '$script:token': 'jwt-abc' });

    const snapshot = { 'jwt': 'rotated-by-script', '$script:token': 'jwt-abc' };
    expect(scope.sanitize(snapshot)).toEqual({ jwt: 'rotated-by-script' });
  });
});
