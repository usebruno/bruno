import { exec, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BRU_BIN = path.resolve(__dirname, '../../packages/bruno-cli/bin/bru.js');

// An in-process test server can only keep serving while the CLI runs if the event loop stays free.
export const runCLIAsync = (cwd: string, args: string): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    exec(`node "${BRU_BIN}" ${args}`, { cwd, env: { ...process.env, FORCE_COLOR: '0' } }, (error, stdout, stderr) =>
      resolve({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout, stderr })
    );
  });

/** A failed run says nothing on its own, so the exit code assertion carries what the cli printed. */
export const cliOutput = ({ code, stdout, stderr }: { code: number; stdout: string; stderr: string }) =>
  `bru exited ${code}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`;

export const importOpenApiWithCli = (specPath: string, outputFile: string, flags: string[] = []) => {
  execFileSync('node', [BRU_BIN, 'import', 'openapi', '--source', specPath, '--output-file', outputFile, ...flags], { stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(outputFile, 'utf8'));
};
