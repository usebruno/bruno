import { test, expect } from '../../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test.describe('CLI environment variable overrides (--env-var / --global-env-var)', () => {
  const fixturesRoot = path.resolve(__dirname, 'fixtures/workspace');
  const collectionPath = path.join(fixturesRoot, 'collection');
  const bruCli = path.resolve(__dirname, '../../../packages/bruno-cli/bin/bru.js');
  const BRU = `node "${bruCli}"`;

  // Run the CLI and return the exit code (0 on success).
  const runFrom = (cwd: string, args: string): number => {
    try {
      execSync(`cd "${cwd}" && ${BRU} ${args}`, { stdio: 'pipe' });
      return 0;
    } catch (error: any) {
      return error?.status ?? 1;
    }
  };

  // Run the CLI, read the JSON report it writes, then clean it up.
  const runAndReadReport = (args: string, outputName: string) => {
    const outputPath = path.join(collectionPath, outputName);
    runFrom(collectionPath, `${args} --reporter-json "${outputPath}"`);
    expect(fs.existsSync(outputPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    try {
      fs.unlinkSync(outputPath);
    } catch (_) {}
    return report.results[0];
  };

  test('--global-env-var overrides a global environment variable', async () => {
    const result = runAndReadReport(
      'run request-global.yml --global-env global-env --global-env-var foo=barbar',
      'global-env-var-out.json'
    );

    expect(JSON.parse(result.request.data).globalFoo).toBe('barbar');
  });

  test('--env-var overrides a collection environment variable', async () => {
    const result = runAndReadReport(
      'run request-local.yml --env local-env --env-var wibble=wobblewobble',
      'local-env-var-out.json'
    );

    expect(JSON.parse(result.request.data).wibble).toBe('wobblewobble');
  });

  test('--env-var does NOT leak into the global environment', async () => {
    // Regression guard: previously --env-var also overrode the global env var
    // of the same name. It must only affect the collection environment now.
    const result = runAndReadReport(
      'run request-global.yml --global-env global-env --env-var foo=barbar',
      'no-leak-out.json'
    );

    expect(JSON.parse(result.request.data).globalFoo).toBe('bar');
  });

  test('--global-env-var without --global-env exits with an error', async () => {
    const exitCode = runFrom(
      collectionPath,
      'run request-global.yml --global-env-var foo=barbar'
    );

    expect(exitCode).not.toBe(0);
  });

  test('malformed --global-env-var (missing "=") exits with an error', async () => {
    const exitCode = runFrom(
      collectionPath,
      'run request-global.yml --global-env global-env --global-env-var foobar'
    );

    expect(exitCode).not.toBe(0);
  });

  test('without overrides, environment values are preserved', async () => {
    const globalResult = runAndReadReport(
      'run request-global.yml --global-env global-env',
      'global-original-out.json'
    );
    expect(JSON.parse(globalResult.request.data).globalFoo).toBe('bar');

    const localResult = runAndReadReport(
      'run request-local.yml --env local-env',
      'local-original-out.json'
    );
    expect(JSON.parse(localResult.request.data).wibble).toBe('wobble');
  });
});
