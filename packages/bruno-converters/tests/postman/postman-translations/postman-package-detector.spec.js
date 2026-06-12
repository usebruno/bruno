import {
  normalizePackageName,
  extractPackagesFromScript,
  classifyPackages,
  buildPackageReport
} from '../../../src/postman/postman-package-detector';

describe('postman-package-detector :: normalizePackageName', () => {
  test('returns plain package names unchanged', () => {
    expect(normalizePackageName('lodash')).toBe('lodash');
  });

  test('strips npm: prefix', () => {
    expect(normalizePackageName('npm:lodash')).toBe('lodash');
  });

  test('strips @version suffix', () => {
    expect(normalizePackageName('lodash@4.17.21')).toBe('lodash');
  });

  test('strips both npm: prefix and @version suffix', () => {
    expect(normalizePackageName('npm:lodash@4.17.21')).toBe('lodash');
  });

  test('preserves the leading @ of scoped packages', () => {
    expect(normalizePackageName('@scope/pkg')).toBe('@scope/pkg');
  });

  test('strips @version from scoped packages without touching the scope', () => {
    expect(normalizePackageName('npm:@scope/pkg@1.2.3')).toBe('@scope/pkg');
  });

  test('returns null for relative imports', () => {
    expect(normalizePackageName('./helpers')).toBeNull();
    expect(normalizePackageName('../shared/util')).toBeNull();
    expect(normalizePackageName('/abs/path')).toBeNull();
  });

  test('strips node: prefix from Node builtin specifiers', () => {
    expect(normalizePackageName('node:crypto')).toBe('crypto');
    expect(normalizePackageName('node:fs/promises')).toBe('fs');
  });

  test('drops subpath imports to the package root', () => {
    expect(normalizePackageName('lodash/get')).toBe('lodash');
    expect(normalizePackageName('lodash/fp/map')).toBe('lodash');
  });

  test('drops subpath imports on scoped packages but keeps the scope', () => {
    expect(normalizePackageName('@scope/pkg/sub')).toBe('@scope/pkg');
    expect(normalizePackageName('npm:@scope/pkg/sub')).toBe('@scope/pkg');
  });

  test('returns null for non-string or empty inputs', () => {
    expect(normalizePackageName(null)).toBeNull();
    expect(normalizePackageName(undefined)).toBeNull();
    expect(normalizePackageName(123)).toBeNull();
    expect(normalizePackageName('')).toBeNull();
    expect(normalizePackageName('   ')).toBeNull();
  });
});

describe('postman-package-detector :: extractPackagesFromScript', () => {
  test('rewrites pm.require to require and reports the package', () => {
    const { translatedSource, packages } = extractPackagesFromScript(
      `const _ = pm.require('lodash');`
    );
    expect(translatedSource).toBe(`const _ = require('lodash');`);
    expect(packages).toEqual(['lodash']);
  });

  test('strips the npm: prefix during rewrite', () => {
    const { translatedSource, packages } = extractPackagesFromScript(
      `const _ = pm.require('npm:lodash');`
    );
    expect(translatedSource).toBe(`const _ = require('lodash');`);
    expect(packages).toEqual(['lodash']);
  });

  test('strips the @version suffix during rewrite', () => {
    const { translatedSource, packages } = extractPackagesFromScript(
      `const _ = pm.require("npm:lodash@4.17.21");`
    );
    expect(translatedSource).toBe(`const _ = require("lodash");`);
    expect(packages).toEqual(['lodash']);
  });

  test('preserves scoped packages and strips their version', () => {
    const { translatedSource, packages } = extractPackagesFromScript(
      `const x = pm.require('npm:@scope/pkg@1.2.3');`
    );
    expect(translatedSource).toBe(`const x = require('@scope/pkg');`);
    expect(packages).toEqual(['@scope/pkg']);
  });

  test('detects plain require() calls without rewriting them', () => {
    const { translatedSource, packages } = extractPackagesFromScript(
      `const ajv = require('ajv');`
    );
    expect(translatedSource).toBe(`const ajv = require('ajv');`);
    expect(packages).toEqual(['ajv']);
  });

  test('detects multiple packages across pm.require and require', () => {
    const script = `
      const _ = pm.require('lodash');
      const cheerio = pm.require('npm:cheerio');
      const xml2js = require('xml2js');
    `;
    const { translatedSource, packages } = extractPackagesFromScript(script);
    expect(translatedSource).toContain(`require('lodash')`);
    expect(translatedSource).toContain(`require('cheerio')`);
    expect(translatedSource).toContain(`require('xml2js')`);
    expect(translatedSource).not.toContain('pm.require');
    expect(new Set(packages)).toEqual(new Set(['lodash', 'cheerio', 'xml2js']));
  });

  test('does not report relative requires as packages', () => {
    const script = `
      const helper = require('./helpers');
      const shared = require('../shared');
      const ajv = require('ajv');
    `;
    const { packages } = extractPackagesFromScript(script);
    expect(packages).toEqual(['ajv']);
  });

  test('accepts the Postman script.exec array form', () => {
    const { translatedSource, packages } = extractPackagesFromScript([
      `const _ = pm.require('lodash');`,
      `const x = require('xml2js');`
    ]);
    expect(translatedSource.split('\n')).toEqual([
      `const _ = require('lodash');`,
      `const x = require('xml2js');`
    ]);
    expect(new Set(packages)).toEqual(new Set(['lodash', 'xml2js']));
  });

  test('returns input unchanged for null / undefined script', () => {
    expect(extractPackagesFromScript(null)).toEqual({
      translatedSource: null,
      packages: []
    });
    expect(extractPackagesFromScript(undefined)).toEqual({
      translatedSource: undefined,
      packages: []
    });
  });

  test('does not falsely match identifiers ending in "require"', () => {
    // e.g. `myrequire('foo')` or `obj.require('foo')` should not be picked up.
    const script = `obj.require('foo'); myrequire('bar');`;
    const { packages } = extractPackagesFromScript(script);
    expect(packages).toEqual([]);
  });
});

describe('postman-package-detector :: classifyPackages', () => {
  test('routes safe-mode packages into safeMode bucket', () => {
    const report = classifyPackages(['uuid', 'axios', 'jsonwebtoken', 'nanoid']);
    expect(report.safeMode).toEqual(['axios', 'jsonwebtoken', 'nanoid', 'uuid']);
    expect(report.needsInstall).toEqual([]);
  });

  test('routes Node builtins and bundled libs into devMode bucket', () => {
    const report = classifyPackages(['fs', 'crypto', 'chai', 'moment', 'lodash']);
    expect(report.devMode).toEqual(expect.arrayContaining(['chai', 'crypto', 'fs', 'lodash', 'moment']));
    expect(report.needsInstall).toEqual([]);
  });

  test('routes unknown external packages into needsInstall bucket', () => {
    const report = classifyPackages(['ajv', 'cheerio', 'xml2js', 'csv-parse']);
    expect(report.needsInstall).toEqual(['ajv', 'cheerio', 'csv-parse', 'xml2js']);
  });

  test('flags Postman-specific packages as unsupported', () => {
    const report = classifyPackages([
      'postman-collection',
      '@postman/foo',
      '@team/secret'
    ]);
    expect(report.unsupported).toEqual(expect.arrayContaining([
      'postman-collection',
      '@postman/foo',
      '@team/secret'
    ]));
    expect(report.needsInstall).toEqual([]);
  });

  test('dedupes inputs across all buckets', () => {
    const report = classifyPackages(['ajv', 'ajv', 'lodash', 'lodash', 'uuid']);
    expect(report.needsInstall).toEqual(['ajv']);
    expect(report.devMode).toEqual(['lodash']);
    expect(report.safeMode).toEqual(['uuid']);
  });
});

describe('postman-package-detector :: buildPackageReport', () => {
  test('sets hasAny=false when no packages are referenced', () => {
    const report = buildPackageReport([]);
    expect(report.hasAny).toBe(false);
  });

  test('sets hasAny=true when there is something to install', () => {
    const report = buildPackageReport(['ajv']);
    expect(report.hasAny).toBe(true);
    expect(report.needsInstall).toEqual(['ajv']);
  });

  test('sets hasAny=true when there are unsupported packages to flag', () => {
    const report = buildPackageReport(['postman-collection']);
    expect(report.hasAny).toBe(true);
    expect(report.unsupported).toEqual(['postman-collection']);
  });

  test('sets hasAny=true when only dev-mode libs are referenced', () => {
    // Libraries like lodash work only in Developer Mode, so a Safe-Mode
    // collection still needs a prompt — the modal decides whether to show a
    // switch CTA based on the collection's current sandbox mode.
    const report = buildPackageReport(['lodash']);
    expect(report.hasAny).toBe(true);
    expect(report.devMode).toEqual(['lodash']);
    expect(report.needsInstall).toEqual([]);
  });

  test('sets hasAny=false when only safe-mode packages are referenced', () => {
    // Safe-mode shims (uuid, axios, etc.) work out of the box regardless of
    // sandbox mode, so surfacing a prompt would be noise.
    const report = buildPackageReport(['uuid', 'path']);
    expect(report.hasAny).toBe(false);
    expect(report.needsInstall).toEqual([]);
    expect(report.unsupported).toEqual([]);
  });
});
