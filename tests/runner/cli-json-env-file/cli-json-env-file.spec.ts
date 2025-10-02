import { test, expect } from '../../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import constants from '../../../packages/bruno-cli/src/constants.js';

test.describe('CLI JSON Environment File Support', () => {
  const collectionPath = path.resolve(__dirname, 'collection');
  const BRU = 'node ../../../../packages/bruno-cli/bin/bru.js';

  const runFrom = (cwd: string, args: string): number => {
    try {
      execSync(`cd "${cwd}" && ${BRU} ${args}`, { stdio: 'pipe' });
      return 0;
    } catch (error: any) {
      return error?.status ?? 1;
    }
  };

  test('CLI: Run with non-existent JSON environment file should fail', async () => {
    const status = runFrom(collectionPath, 'run --format json --env-file non-existent.json');
    expect(status).toBe(constants.EXIT_STATUS.ERROR_ENV_NOT_FOUND);
  });

  test('CLI: Run with invalid JSON environment file should fail', async () => {
    // Create a temporary invalid JSON file
    const tempDir = '/tmp/bruno-cli-test';
    const invalidEnvPath = path.join(tempDir, 'invalid-env.json');

    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(invalidEnvPath,
      JSON.stringify({
        name: 'Invalid Env'
        // missing variables array - invalid JSON
      }));

    const status = runFrom(collectionPath, `run --env-file "${invalidEnvPath}"`);
    expect(status).toBe(constants.EXIT_STATUS.ERROR_INVALID_JSON);
    try {
      // Cleanup
      fs.unlinkSync(invalidEnvPath);
      fs.rmdirSync(tempDir);
    } catch (e) {}
  });

  test('CLI: Run with valid JSON env and interpolates variables', async () => {
    const envPath = path.join(collectionPath, 'env.json');
    const outputPath = path.join(collectionPath, 'out.json');

    // Even if exit is non-zero (network warnings), reporter should be written
    runFrom(collectionPath, `run request.bru --env-file "${envPath}" --reporter-json "${outputPath}"`);

    expect(fs.existsSync(outputPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const result = report.results[0];
    expect(result.request.url).toBe('https://httpbin.org/status/200');
    expect(result.response.status).toBe(200);

    try {
      fs.unlinkSync(outputPath);
    } catch (_) {}
  });
});
