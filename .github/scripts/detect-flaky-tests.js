const fs = require('fs');


// Read Playwright JSON report
const resultsPath = 'playwright-report/results.json';

if (!fs.existsSync(resultsPath)) {
  console.log('No Playwright results found at', resultsPath);
  process.exit(0);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Extract flaky tests
// A test is flaky if: status === "passed" AND retry > 0
// A test is failed if: status === "failed"
// This means it failed initially but passed on retry OR failed completely
const flakyTests = [];

function traverseSuites(suites) {
  for (const suite of suites) {
    // Process specs in this suite
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        // Check each test result
        for (const result of test.results || []) {
          // Track two types of problematic tests:
          // 1. Flaky: passed on a retry attempt (retry > 0)
          // 2. Failed: failed on all attempts
          if ((result.status === 'passed' && result.retry > 0) || result.status === 'failed') {
            flakyTests.push({
              file: spec.file,
              title: spec.title,
              testTitle: spec.title,
              line: spec.line,
              status: result.status,
              retryAttempt: result.retry
            });
            break; // Only record once per test
          }
        }
      }
    }

    // Recursively process nested suites
    if (suite.suites && suite.suites.length > 0) {
      traverseSuites(suite.suites);
    }
  }
}

traverseSuites(results.suites || []);

// Save flaky tests to JSON
fs.writeFileSync('flaky-tests.json', JSON.stringify(flakyTests, null, 2));

// Generate markdown report
let markdown = '## ⚠️ Flaky/Failed Tests Detected\n\n';
markdown += 'The following tests are problematic:\n\n';

flakyTests.forEach(test => {
  const testType = test.status === 'failed' ? '❌ Failed' : '⚠️ Flaky';
  markdown += `### ${testType}: \`${test.file}\`\n`;
  markdown += `- **Test:** ${test.testTitle}\n`;
  markdown += `- **Status:** ${test.status}\n`;
  if (test.retryAttempt > 0) {
    markdown += `- **Retry Attempt:** ${test.retryAttempt}\n`;
  }
  markdown += `- **Debug command:**\n`;
  markdown += '```bash\n';
  markdown += `npx playwright test ${test.file} --repeat-each=5 --workers=1\n`;
  markdown += '```\n\n';
});

fs.writeFileSync('flaky-report.md', markdown);

console.log(`Found ${flakyTests.length} flaky/failed tests`);
process.exit(flakyTests.length > 0 ? 1 : 0);
