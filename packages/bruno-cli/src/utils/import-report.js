const chalk = require('chalk');
const { isValidNpmPackageName } = require('@usebruno/common').utils;

const countItems = (items = []) => {
  return items.reduce((counts, item) => {
    if (item.type === 'folder') {
      const nested = countItems(item.items);
      return { requests: counts.requests + nested.requests, folders: counts.folders + nested.folders + 1 };
    }
    return { ...counts, requests: counts.requests + 1 };
  }, { requests: 0, folders: 0 });
};

const formatImportSummary = (collection) => {
  const { requests, folders } = countItems(collection.items);
  const environmentCount = (collection.environments || []).length;
  const environments = environmentCount ? `, ${environmentCount} environments` : '';
  return `Imported ${requests} requests in ${folders} folders${environments}`;
};

const hasImportErrors = (issues) => issues.some((issue) => issue.severity === 'error');

/**
 * Mirrors the app's import toast: `error` issues are items the converter skipped, `warning` issues
 * were imported in a degraded form.
 */
const formatImportIssues = (issues) => {
  if (!issues.length) {
    return [];
  }

  const skipped = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.length - skipped;
  const lines = issues.map((issue) => {
    return issue.severity === 'error'
      ? chalk.red(`  error   [${issue.path}] ${issue.message}`)
      : chalk.yellow(`  warning [${issue.path}] ${issue.message}`);
  });

  return [`${skipped} item(s) skipped, ${warnings} warning(s)`, ...lines];
};

const formatPackageReport = (packageReport) => {
  if (!packageReport?.hasAny) {
    return [];
  }

  const { unsupported = [], devMode = [] } = packageReport;
  // Names come from require() calls in the imported scripts, so keep anything that isn't a plain
  // npm name out of the copy-paste install command.
  const needsInstall = (packageReport.needsInstall || []).filter(isValidNpmPackageName);
  if (!needsInstall.length && !unsupported.length && !devMode.length) {
    return [];
  }

  const lines = ['Packages referenced by scripts:'];
  if (needsInstall.length) {
    lines.push(`  needs install:        ${needsInstall.join(', ')}   (run inside the collection: npm install --save ${needsInstall.join(' ')})`);
  }
  if (unsupported.length) {
    lines.push(`  unsupported:          ${unsupported.join(', ')}   (no Bruno equivalent; scripts using it will fail)`);
  }
  if (devMode.length) {
    lines.push(`  developer mode only:  ${devMode.join(', ')}   (available only with the developer-mode sandbox)`);
  }

  return lines;
};

module.exports = {
  formatImportSummary,
  formatImportIssues,
  formatPackageReport,
  hasImportErrors
};
