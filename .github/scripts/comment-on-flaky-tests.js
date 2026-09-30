const fs = require('fs');
const { execSync } = require('child_process');

// Check if flaky-tests.json exists
if (!fs.existsSync('flaky-tests.json')) {
  console.log('No flaky-tests.json found');
  process.exit(0);
}

// Get changed files in PR
let changedFiles = [];
try {
  changedFiles = execSync('git diff --name-only origin/main...HEAD')
    .toString()
    .split('\n')
    .filter(f => f.endsWith('.spec.ts'));
} catch (error) {
  console.log('Could not determine changed files:', error.message);
  process.exit(0);
}

if (changedFiles.length === 0) {
  console.log('No test files were modified in this PR');
  process.exit(0);
}

// Read flaky tests
const flakyTests = JSON.parse(fs.readFileSync('flaky-tests.json', 'utf8'));

if (flakyTests.length === 0) {
  console.log('No flaky/failed tests found');
  process.exit(0);
}

// Find modified flaky tests
const modifiedFlakyTests = flakyTests.filter(test =>
  changedFiles.some(file => test.file.includes(file))
);

if (modifiedFlakyTests.length === 0) {
  console.log('No modified test files are flaky');
  process.exit(0);
}

// Generate comment markdown
let comment = '## ⚠️ Warning: You modified flaky/failed test files\n\n';
comment += 'The following test files you modified have reliability issues:\n\n';

modifiedFlakyTests.forEach(test => {
  const testType = test.status === 'failed' ? '❌ Failed' : '⚠️ Flaky';
  comment += `### ${testType}: \`${test.file}\`\n`;
  comment += `**Test:** ${test.testTitle}\n`;
  comment += `**Status:** ${test.status}\n`;
  if (test.retryAttempt > 0) {
    comment += `**Retry Attempt:** ${test.retryAttempt}\n`;
  }
  comment += '\n**To debug locally, run:**\n';
  comment += '```bash\n';
  comment += `npx playwright test ${test.file} --repeat-each=5 --workers=1\n`;
  comment += '```\n\n';
});

comment += '---\n';
comment += '**Note:** Flaky tests passed after retrying, failed tests did not pass. ';
comment += 'Please investigate and fix the root cause before merging.\n';

// Save comment to file for GitHub Action to post
fs.writeFileSync('pr-comment.md', comment);

console.log(`Found ${modifiedFlakyTests.length} modified flaky tests`);
