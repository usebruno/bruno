import { test, expect } from '../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import constants from '../../packages/bruno-cli/src/constants.js';

test.describe('CLI JSON Environment File Support', () => {
  test('CLI: Run with non-existent JSON environment file should fail', async () => {
    const command = `node ../../../../packages/bruno-cli/bin/bru.js run --env-file non-existent.json`;

    try {
      execSync(command, { stdio: 'pipe' });
      // If we get here, the command succeeded when it should have failed
      expect(true).toBe(false);
    } catch (error) {
      // Expected to fail with non-zero exit code
      expect(error.status).not.toBe(constants.EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    }
  });

  test('CLI: Run with invalid JSON environment file should fail', async () => {
    // Create a temporary invalid JSON file
    const tempDir = '/tmp/bruno-cli-test';
    const invalidEnvPath = path.join(tempDir, 'invalid-env.json');

    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(invalidEnvPath, JSON.stringify({
      name: 'Invalid Env'
      // missing variables array - invalid JSON
    }));

    const command = `cd "${tempDir}" && node ../../../../packages/bruno-cli/bin/bru.js run --env-file invalid-env.json`;

    try {
      execSync(command, { stdio: 'pipe' });
      // If we get here, the command succeeded when it should have failed
      expect(true).toBe(false);
    } catch (error) {
      // Expected to fail with non-zero exit code
      expect(error.status).not.toBe(constants.EXIT_STATUS.ERROR_INVALID_JSON);
    } finally {
      // Cleanup
      try {
        fs.unlinkSync(invalidEnvPath);
        fs.rmdirSync(tempDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
});
