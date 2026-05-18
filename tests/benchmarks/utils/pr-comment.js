#!/usr/bin/env node

/**
 * Generic benchmark PR comment: posts/updates a comparison table on a PR.
 *
 * Called by CI via actions/github-script:
 *   const run = require('./tests/benchmarks/utils/pr-comment.js');
 *   await run({ github, context, resultsPath, baselinePath, title });
 */

const fs = require('fs');

function buildCommentBody(results, baseline, title) {
  const threshold = baseline.thresholdPercent || 20;
  const resultEntries = results.entries || results;
  const baselineEntries = baseline.entries || {};
  const marker = `## ${title}`;

  let body = `${marker}\n\n`;
  body += `| Key | Mean (ms) | Baseline Mean | Change | Status |\n`;
  body += `|---|---|---|---|---|\n`;

  let hasRegression = false;

  for (const [key, data] of Object.entries(resultEntries)) {
    const base = baselineEntries[key];
    if (!base) continue;

    const changePercent = (data.mean - base.mean) / base.mean * 100;
    const changeStr = changePercent.toFixed(1);
    const status = changePercent > threshold ? '🔴 REGRESSION' : changePercent < -threshold ? '🟢 IMPROVED' : '✅ OK';
    if (changePercent > threshold) hasRegression = true;

    body += `| ${key} | ${Math.round(data.mean)} | ${base.mean} | ${changePercent > 0 ? '+' : ''}${changeStr}% | ${status} |\n`;
  }

  body += `\n> Threshold: ${threshold}% regression allowed\n`;

  if (hasRegression) {
    body += '\n⚠️ **Performance regression detected.** If expected, update the baseline.\n';
  }

  return { body, marker };
}

async function postOrUpdateComment(github, context, body, marker) {
  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number
  });

  const existing = comments.find((c) => c.body.startsWith(marker));

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body
    });
  }
}

module.exports = async function run({ github, context, resultsPath, baselinePath, title }) {
  if (!fs.existsSync(resultsPath)) {
    console.log(`No benchmark results found at ${resultsPath}, skipping comment.`);
    return;
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const { body, marker } = buildCommentBody(results, baseline, title);

  await postOrUpdateComment(github, context, body, marker);
};
