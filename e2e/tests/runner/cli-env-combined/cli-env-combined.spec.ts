import { test, expect } from '../../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test.describe('CLI Combined Environment Support (--env and --env-file)', () => {
  const collectionPath = path.resolve(__dirname, 'collection');
  const BRU = 'node ../../../../packages/bruno-cli/bin/bru.js';

  // Helper: run bru CLI and return exit code
  const runFrom = (cwd: string, args: string): number => {
    try {
      execSync(`cd "${cwd}" && ${BRU} ${args}`, { stdio: 'pipe' });
      return 0;
    } catch (error: any) {
      return error?.status ?? 1;
    }
  };

  test('CLI: Should allow --env and --env-file to be used together', async () => {
    const envFilePath = path.join(collectionPath, 'global-env.json');
    const outputPath = path.join(collectionPath, 'combined-out.json');

    // This should NOT error out anymore - both options should be accepted
    runFrom(
      collectionPath,
      `run request.bru --env CollectionEnv --env-file "${envFilePath}" --reporter-json "${outputPath}"`
    );

    // Check that the output file was created (command ran successfully)
    expect(fs.existsSync(outputPath)).toBe(true);

    try {
      fs.unlinkSync(outputPath);
    } catch (_) {}
  });

  test('CLI: Collection env (--env) should override env-file variables', async () => {
    const envFilePath = path.join(collectionPath, 'global-env.json');
    const outputPath = path.join(collectionPath, 'override-out.json');

    runFrom(
      collectionPath,
      `run request.bru --env CollectionEnv --env-file "${envFilePath}" --reporter-json "${outputPath}"`
    );

    expect(fs.existsSync(outputPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const result = report.results[0];

    // baseUrl should be from collection env (https://echo.usebruno.com), not global (https://global.example.com)
    expect(result.request.url).toBe('https://echo.usebruno.com');

    // overrideVar should be from collection env, not global
    const body = JSON.parse(result.request.data);
    expect(body.overrideVar).toBe('collection-value');

    // globalOnly should come from env-file since it's not in collection env
    expect(body.globalOnly).toBe('from-global');

    // collectionOnly should come from collection env
    expect(body.collectionOnly).toBe('from-collection');

    try {
      fs.unlinkSync(outputPath);
    } catch (_) {}
  });

  test('CLI: --env-file only should still work', async () => {
    const envFilePath = path.join(collectionPath, 'global-env.json');
    const outputPath = path.join(collectionPath, 'envfile-only-out.json');

    runFrom(collectionPath, `run request.bru --env-file "${envFilePath}" --reporter-json "${outputPath}"`);

    expect(fs.existsSync(outputPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const result = report.results[0];

    // Should use env-file values when --env is not provided
    // baseUrl would be from global-env.json but the request would fail since it's not a real URL
    // We just verify the interpolation happened
    expect(result.request.url).toBe('https://global.example.com');

    try {
      fs.unlinkSync(outputPath);
    } catch (_) {}
  });

  test('CLI: --env only should still work', async () => {
    const outputPath = path.join(collectionPath, 'env-only-out.json');

    runFrom(collectionPath, `run request.bru --env CollectionEnv --reporter-json "${outputPath}"`);

    expect(fs.existsSync(outputPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const result = report.results[0];

    // Should use collection env values
    expect(result.request.url).toBe('https://echo.usebruno.com');

    const body = JSON.parse(result.request.data);
    expect(body.overrideVar).toBe('collection-value');
    expect(body.collectionOnly).toBe('from-collection');
    // globalOnly is not in collection env, so it should remain as template
    expect(body.globalOnly).toBe('{{globalOnly}}');

    try {
      fs.unlinkSync(outputPath);
    } catch (_) {}
  });
});
