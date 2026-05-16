const chalk = require('chalk');

/**
 * Format a drift report as colored text for the terminal.
 */
const formatTextReport = (report, specInfo, source) => {
  const lines = [];

  lines.push(chalk.bold('OpenAPI Sync Report'));
  lines.push(`Source: ${source} (${specInfo.title}${specInfo.version ? ` v${specInfo.version}` : ''})`);
  lines.push('');

  const { summary, missing, stale, modified, inSync } = report;

  if (missing.length > 0) {
    lines.push(chalk.yellow(`Missing from collection (${missing.length}):`));
    for (const item of missing) {
      lines.push(chalk.yellow(`  + ${item.method.padEnd(7)} ${item.path}`));
    }
    lines.push('');
  }

  if (stale.length > 0) {
    lines.push(chalk.red(`Stale in collection (${stale.length}):`));
    for (const item of stale) {
      lines.push(chalk.red(`  - ${item.method.padEnd(7)} ${item.path}`));
    }
    lines.push('');
  }

  if (modified.length > 0) {
    lines.push(chalk.cyan(`Modified (${modified.length}):`));
    for (const item of modified) {
      lines.push(chalk.cyan(`  ~ ${item.method.padEnd(7)} ${item.path}  (${item.changes})`));
    }
    lines.push('');
  }

  if (inSync.length > 0) {
    lines.push(chalk.green(`In sync: ${inSync.length}`));
    lines.push('');
  }

  const parts = [];
  if (summary.missing > 0) parts.push(chalk.yellow(`${summary.missing} missing`));
  if (summary.stale > 0) parts.push(chalk.red(`${summary.stale} stale`));
  if (summary.modified > 0) parts.push(chalk.cyan(`${summary.modified} modified`));
  parts.push(chalk.green(`${summary.inSync} in sync`));

  lines.push(`Summary: ${parts.join(', ')}`);

  return lines.join('\n');
};

/**
 * Format a drift report as JSON.
 */
const formatJsonReport = (report, specInfo, source) => {
  return JSON.stringify({ source, specInfo, ...report }, null, 2);
};

module.exports = { formatTextReport, formatJsonReport };
