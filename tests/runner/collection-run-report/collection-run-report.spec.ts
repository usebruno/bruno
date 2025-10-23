import { test, expect } from '../../../playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function normalizeJunitReport(xmlContent: string): string {
  return xmlContent
    // Replace timestamps with fixed value
    .replace(/timestamp="[^"]*"/g, 'timestamp="2024-01-01T00:00:00.000"')
    // Replace hostnames with fixed value
    .replace(/hostname="[^"]*"/g, 'hostname="test-host"')
    // Replace execution times with fixed value
    .replace(/time="[^"]*"/g, 'time="0.100"')
    // Replace file paths with normalized path
    .replace(/name="[^"]*\/[^"]*"/g, 'name="/test/path/collection"');
}

test.describe('Collection Run Report Tests', () => {
  const collectionPath = path.join(__dirname, 'collection');
  
  test('CLI: Run collection and generate JUnit report', async ({ createTmpDir }) => {
    const outputDir = await createTmpDir('junit-report');
    const junitOutputPath = path.join(outputDir, 'cli-report.xml');

    // Run collection via CLI with JUnit reporter
    const command = `cd "${collectionPath}" && node ../../../../packages/bruno-cli/bin/bru.js run --reporter-junit "${junitOutputPath}"`;

    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      // CLI may exit with non-zero code if tests fail, which is expected
      console.log('CLI execution completed with exit code:', error.status);
    }

    // Verify report was generated
    expect(fs.existsSync(junitOutputPath)).toBe(true);
    const junitReportContent = fs.readFileSync(junitOutputPath, 'utf8');

    // Snapshot the normalized XML
    const normalizedJunitReport = normalizeJunitReport(junitReportContent);
    expect(normalizedJunitReport).toMatchSnapshot('cli-junit-report.xml');
  });
});
