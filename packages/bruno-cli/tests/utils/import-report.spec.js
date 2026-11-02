const { describe, it, expect } = require('@jest/globals');
const { formatImportSummary, formatImportIssues, formatPackageReport, hasImportErrors } = require('../../src/utils/import-report');

const stripAnsi = (line) => line.replace(/\x1b\[[0-9;]*m/g, '');

const request = (name, type = 'http-request') => ({ type, name });
const folder = (name, items) => ({ type: 'folder', name, items });

const error = { path: 'Folder / Bad', severity: 'error', message: 'Missing or invalid request method', sourceItem: { name: 'Bad' } };
const warning = { path: 'Login', severity: 'warning', message: 'Script translation fell back to regex replacement: Unexpected token (2:11)' };

describe('formatImportSummary', () => {
  it('counts requests at every depth and every folder', () => {
    const collection = {
      items: [request('Health'), folder('Users', [request('List'), folder('Admin', [request('Create', 'graphql-request')])])],
      environments: []
    };

    expect(formatImportSummary(collection)).toBe('Imported 3 requests in 2 folders');
  });

  it('reports an empty collection', () => {
    expect(formatImportSummary({ items: [], environments: [] })).toBe('Imported 0 requests in 0 folders');
  });

  it('adds the environment count when there are environments', () => {
    const collection = { items: [request('Health')], environments: [{ name: 'staging' }, { name: 'prod' }] };

    expect(formatImportSummary(collection)).toBe('Imported 1 requests in 0 folders, 2 environments');
  });
});

describe('formatImportIssues', () => {
  it('prints nothing without issues', () => {
    expect(formatImportIssues([])).toEqual([]);
  });

  it('prints errors only', () => {
    expect(formatImportIssues([error]).map(stripAnsi)).toEqual([
      '1 item(s) skipped, 0 warning(s)',
      '  error   [Folder / Bad] Missing or invalid request method'
    ]);
  });

  it('prints warnings only', () => {
    expect(formatImportIssues([warning]).map(stripAnsi)).toEqual([
      '0 item(s) skipped, 1 warning(s)',
      '  warning [Login] Script translation fell back to regex replacement: Unexpected token (2:11)'
    ]);
  });

  it('prints a mix in the order given, one line each, without the source item', () => {
    const lines = formatImportIssues([warning, error, warning]).map(stripAnsi);

    expect(lines).toEqual([
      '1 item(s) skipped, 2 warning(s)',
      '  warning [Login] Script translation fell back to regex replacement: Unexpected token (2:11)',
      '  error   [Folder / Bad] Missing or invalid request method',
      '  warning [Login] Script translation fell back to regex replacement: Unexpected token (2:11)'
    ]);
    expect(lines.join('\n')).not.toContain('"name"');
  });
});

describe('hasImportErrors', () => {
  it.each([
    ['no issues', [], false],
    ['warnings only', [warning], false],
    ['errors only', [error], true],
    ['a mix', [warning, error], true]
  ])('is right for %s', (_label, issues, expected) => {
    expect(hasImportErrors(issues)).toBe(expected);
  });
});

describe('formatPackageReport', () => {
  const report = (buckets) => ({ safeMode: [], devMode: [], needsInstall: [], unsupported: [], hasAny: true, ...buckets });

  it.each([
    ['a missing report', undefined],
    ['a report with nothing to act on', report({ safeMode: ['lodash'], hasAny: false })]
  ])('prints nothing for %s', (_label, packageReport) => {
    expect(formatPackageReport(packageReport)).toEqual([]);
  });

  it('prints the install command for packages that need installing', () => {
    expect(formatPackageReport(report({ needsInstall: ['moment', 'uuid'] }))).toEqual([
      'Packages referenced by scripts:',
      '  needs install:        moment, uuid   (run inside the collection: npm install --save moment uuid)'
    ]);
  });

  it('prints unsupported packages', () => {
    expect(formatPackageReport(report({ unsupported: ['postman-collection'] }))).toEqual([
      'Packages referenced by scripts:',
      '  unsupported:          postman-collection   (no Bruno equivalent; scripts using it will fail)'
    ]);
  });

  it('prints developer-mode-only packages', () => {
    expect(formatPackageReport(report({ devMode: ['fs', 'path'] }))).toEqual([
      'Packages referenced by scripts:',
      '  developer mode only:  fs, path   (available only with the developer-mode sandbox)'
    ]);
  });

  it('prints every populated bucket and leaves out safe-mode packages', () => {
    const lines = formatPackageReport(report({ needsInstall: ['moment'], unsupported: ['newman'], devMode: ['fs'], safeMode: ['lodash'] }));

    expect(lines).toHaveLength(4);
    expect(lines.join('\n')).not.toContain('lodash');
  });
});
