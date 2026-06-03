import { test, expect } from '../../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test.describe('CLI --env-var overrides', () => {
  const fixturesRoot = path.resolve(__dirname, 'fixtures/workspace');
  const collectionPath = path.join(fixturesRoot, 'collection');
  const bruCli = path.resolve(__dirname, '../../../packages/bruno-cli/bin/bru.js');
  const BRU = `node "${bruCli}"`;

  const runFrom = (cwd: string, args: string): number => {
    try {
      execSync(`cd "${cwd}" && ${BRU} ${args}`, { stdio: 'pipe' });
      return 0;
    } catch (error: any) {
      return error?.status ?? 1;
    }
  };

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

  test('CLI: --global-env with --env-var overrides global environment variable', async () => {
    const result = runAndReadReport(
      'run request-global.bru --global-env global-env --env-var foo=barbar',
      'global-env-var-out.json'
    );

    const body = JSON.parse(result.request.data);
    expect(body.foo).toBe('barbar');

    expect(result.testResults.every((t: { status: string }) => t.status === 'pass')).toBe(true);
  });

  test('CLI: --env with --env-var overrides collection environment variable', async () => {
    const result = runAndReadReport(
      'run request-local.bru --env local-env --env-var wibble=wobblewobble',
      'local-env-var-out.json'
    );

    const body = JSON.parse(result.request.data);
    expect(body.wibble).toBe('wobblewobble');

    expect(result.testResults.every((t: { status: string }) => t.status === 'pass')).toBe(true);
  });

  test('CLI: without --env-var, environment files keep original values', async () => {
    const globalResult = runAndReadReport(
      'run request-global.bru --global-env global-env',
      'global-env-original-out.json'
    );
    expect(JSON.parse(globalResult.request.data).foo).toBe('bar');

    const localResult = runAndReadReport(
      'run request-local.bru --env local-env',
      'local-env-original-out.json'
    );
    expect(JSON.parse(localResult.request.data).wibble).toBe('wobble');
  });
});
