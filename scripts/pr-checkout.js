#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const prNumber = process.argv[2];

if (!prNumber || !/^\d+$/.test(prNumber)) {
  console.error('Usage: node scripts/pr-checkout.js <pr-number>');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..');
const repoName = path.basename(repoRoot);
const worktreesDir = path.resolve(repoRoot, '..', `${repoName}-worktrees`);
const worktreePath = path.join(worktreesDir, `pr-${prNumber}`);

function log(...args) {
  console.error(...args);
}

function run(cmd, options = {}) {
  log(`$ ${cmd}`);
  return execSync(cmd, { encoding: 'utf-8', cwd: repoRoot, stdio: 'inherit', ...options });
}

function runCapture(cmd) {
  return execSync(cmd, { encoding: 'utf-8', cwd: repoRoot }).trim();
}

// Check if gh CLI is available
try {
  runCapture('gh --version');
} catch {
  console.error('Error: GitHub CLI (gh) is not installed. Install it from https://cli.github.com/');
  process.exit(1);
}

// Get PR info
log(`\nFetching PR #${prNumber} info...`);
let prBranch, prHeadRepo;
try {
  const prInfo = JSON.parse(runCapture(`gh pr view ${prNumber} --json headRefName,headRepository,headRepositoryOwner`));
  prBranch = prInfo.headRefName;
  prHeadRepo = `${prInfo.headRepositoryOwner.login}/${prInfo.headRepository.name}`;
  log(`PR branch: ${prBranch}`);
  log(`PR repo: ${prHeadRepo}`);
} catch (error) {
  console.error(`Error: Could not fetch PR #${prNumber}. Make sure the PR exists and you're authenticated with gh.`);
  process.exit(1);
}

// Check if worktree already exists
if (fs.existsSync(worktreePath)) {
  log(`\nWorktree already exists at ${worktreePath}`);
  log(`To remove it, run: git worktree remove ${worktreePath}`);
  console.log(worktreePath);
  process.exit(0);
}

// Create worktrees directory if needed
if (!fs.existsSync(worktreesDir)) {
  log(`\nCreating worktrees directory: ${worktreesDir}`);
  fs.mkdirSync(worktreesDir, { recursive: true });
}

// Fetch the PR
log(`\nFetching PR #${prNumber}...`);
run(`gh pr checkout ${prNumber} --detach`, { stdio: 'pipe' });

// Get the current commit after checkout
const prCommit = runCapture('git rev-parse HEAD');

// Go back to original branch
const originalBranch = runCapture('git rev-parse --abbrev-ref @{-1} 2>/dev/null || git rev-parse --abbrev-ref HEAD');
run(`git checkout ${originalBranch}`, { stdio: 'pipe' });

// Create the worktree
log(`\nCreating worktree at ${worktreePath}...`);
run(`git worktree add ${worktreePath} ${prCommit}`);

log(`\n✓ PR #${prNumber} checked out to: ${worktreePath}`);
log(`\nTo remove the worktree later:`);
log(`  git worktree remove ${worktreePath}`);

// Output path to stdout for cd integration
console.log(worktreePath);
