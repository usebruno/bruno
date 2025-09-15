import { test, expect } from '../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

test.describe('Collection Run Report Tests', () => {
  const collectionPath = path.join(__dirname, 'collection');
  const outputDir = path.join(__dirname, 'output');

  // Ensure output directory exists
  test.beforeAll(async () => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test('CLI: Run collection and generate JUnit report', async () => {
    const junitOutputPath = path.join(outputDir, 'cli-report.xml');

    // Run collection via CLI with JUnit reporter
    const command = `cd "${collectionPath}" && node ../../../packages/bruno-cli/bin/bru.js run --reporter-junit "${junitOutputPath}"`;

    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      // CLI may exit with non-zero code if tests fail, which is expected
      console.log('CLI execution completed with exit code:', error.status);
    }

    // Verify report was generated and match against snapshot
    expect(fs.existsSync(junitOutputPath)).toBe(true);
    const junitReport = fs.readFileSync(junitOutputPath, 'utf8');
    expect(junitReport).toMatchSnapshot('cli-junit-report.xml');
  });

  test('CLI: Run collection and generate HTML report', async () => {
    const htmlOutputPath = path.join(outputDir, 'cli-report.html');

    // Run collection via CLI with HTML reporter
    const command = `cd "${collectionPath}" && node ../../../packages/bruno-cli/bin/bru.js run --reporter-html "${htmlOutputPath}"`;

    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      // CLI may exit with non-zero code if tests fail, which is expected
      console.log('CLI execution completed with exit code:', error.status);
    }

    // Verify report was generated and match against snapshot
    expect(fs.existsSync(htmlOutputPath)).toBe(true);
    const htmlReport = fs.readFileSync(htmlOutputPath, 'utf8');
    expect(htmlReport).toMatchSnapshot('cli-html-report.html');
  });

  test('CLI: Run collection with all reporters simultaneously', async () => {
    const junitOutputPath = path.join(outputDir, 'all-formats-report.xml');
    const htmlOutputPath = path.join(outputDir, 'all-formats-report.html');

    // Run collection via CLI with all reporters
    const command = `cd "${collectionPath}" && node ../../../packages/bruno-cli/bin/bru.js run --reporter-junit "${junitOutputPath}" --reporter-html "${htmlOutputPath}"`;

    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      // CLI may exit with non-zero code if tests fail, which is expected
      console.log('CLI execution completed with exit code:', error.status);
    }

    // Verify all reports were generated and match against snapshots
    expect(fs.existsSync(junitOutputPath)).toBe(true);
    expect(fs.existsSync(htmlOutputPath)).toBe(true);

    const junitReport = fs.readFileSync(junitOutputPath, 'utf8');
    const htmlReport = fs.readFileSync(htmlOutputPath, 'utf8');

    // Match all formats against snapshots
    expect(junitReport).toMatchSnapshot('all-formats-junit-report.xml');
    expect(htmlReport).toMatchSnapshot('all-formats-html-report.html');
  });
});
