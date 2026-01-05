#!/usr/bin/env node
const { execSync } = require('child_process');

/**
 * changed-packages.js
 *
 * Usage:
 *   node scripts/changed-packages.js <ref>
 *
 * Examples:
 *   node scripts/changed-packages.js main
 *   node scripts/changed-packages.js v1.2.3
 *
 * Description:
 *   Prints the top-level package directories under `packages/` that
 *   have changed since <ref>.
 *
 * Options:
 *   -h, --help    Show this help message
 */

const USAGE = [
  'Usage:',
  '  node scripts/changed-packages.js <ref>',
  '',
  'Examples:',
  '  node scripts/changed-packages.js main',
  '  node scripts/changed-packages.js v1.2.3',
  '',
  'Description:',
  '  Print package directories under packages/ that have changed since <ref>.',
  '',
  'Options:',
  '  -h, --help    Show this help message'
].join('\n');

const ref = process.argv.slice(2)[0];

if (!ref || ['-h', '--help'].includes(ref)) {
  console.log(USAGE);
  process.exit(0);
}

const getRefs = execSync(`git show-ref`);

const refs = getRefs.toString().split('\n').filter((d) => d.includes('refs/heads') || d.includes('refs/tags')).map((d) => {
  const [_, refPath] = d.split(/\s+/);
  return refPath.replace('refs/heads/', '').replace('refs/tags/', '');
});

if (!refs.includes(ref)) {
  console.error('The passed in Ref cannot be found');
  process.exit(1);
}

const pipeline = [
  `git diff --dirstat=files,0 ${ref}`,
  `xargs dirname`,
  `cut -d/ -f1-2`,
  `sort`,
  `uniq`,
  `grep packages/`
];

const output = execSync(
  pipeline.join('|')
);

console.log(output.toString());
