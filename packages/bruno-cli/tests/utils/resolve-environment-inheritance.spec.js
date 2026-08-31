const os = require('os');
const fs = require('fs');
const path = require('path');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { stringifyEnvironment } = require('@usebruno/filestore');
const { resolveEnvironmentInheritance } = require('../../src/utils/environment');

// The resolution algorithm itself is owned by @usebruno/common's environment-inheritance.spec.ts.
// This spec covers what the CLI adds on top: the chain is walked across sibling *files*, so the
// ancestor is looked up by file name, is confined to one directory and one extension, and `extends`
// only survives in the formats that persist it.
describe('resolveEnvironmentInheritance', () => {
  let environmentsDir;

  beforeEach(() => {
    environmentsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-env-inheritance-'));
  });

  afterEach(() => {
    fs.rmSync(environmentsDir, { recursive: true, force: true });
  });

  const variable = ({ name, value = '', enabled = true, secret = false }) => ({
    name,
    value,
    enabled,
    secret,
    type: 'text'
  });

  // Secrets are stored by name only on disk — their value lives outside the environment file.
  const secretVariable = (props) => variable({ ...props, value: '', secret: true });

  const writeEnvironment = ({
    name,
    fileName = name,
    format = 'yml',
    directory = environmentsDir,
    eol = '\n',
    ...environment
  }) => {
    const filePath = path.join(directory, `${fileName}.${format}`);
    const content
      = format === 'json'
        ? JSON.stringify({ name, variables: [], ...environment })
        : stringifyEnvironment({ name, variables: [], ...environment }, { format });

    fs.writeFileSync(filePath, content.replace(/\n/g, eol));

    return filePath;
  };

  // Parsing stamps a fresh uid on the environment and on every row; they identify nothing on disk,
  // so drop them before comparing against the variables the fixture wrote.
  const withoutUids = (value) => JSON.parse(JSON.stringify(value, (key, v) => (key === 'uid' ? undefined : v)));

  const rowsOf = (result) => withoutUids([...(result.inheritedVariables ?? []), ...(result.variables ?? [])]);

  const valueOf = (result, name) => rowsOf(result).find((row) => row.name === name)?.value;

  const sourceOf = (result, name) => rowsOf(result).find((row) => row.name === name)?.inheritedFrom?.name;

  describe('an environment with nothing to inherit', () => {
    it('leaves a non-inheriting environment untouched, disabled and secret rows included', () => {
      const variables = [
        variable({ name: 'host', value: 'a' }),
        variable({ name: 'off', value: 'x', enabled: false }),
        secretVariable({ name: 'token' })
      ];
      const filePath = writeEnvironment({ name: 'base', variables });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(withoutUids(result)).toEqual({ name: 'base', color: null, variables, inheritedVariables: [] });
    });

    it('resolves an environment whose reference has no sibling file instead of throwing', () => {
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [variable({ name: 'host', value: 'dev-host' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(withoutUids(result)).toEqual({
        name: 'dev',
        color: null,
        extends: 'base',
        variables: [variable({ name: 'host', value: 'dev-host' })],
        inheritedVariables: []
      });
    });
  });

  describe('a chain of ancestor files', () => {
    it('merges the parent file into the child', () => {
      writeEnvironment({
        name: 'base',
        variables: [variable({ name: 'scheme', value: 'https' }), variable({ name: 'host', value: 'base-host' })]
      });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [variable({ name: 'host', value: 'dev-host' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(valueOf(result, 'scheme')).toBe('https');
      expect(valueOf(result, 'host')).toBe('dev-host');
    });

    it('applies a three-level chain furthest-ancestor first', () => {
      writeEnvironment({
        name: 'base',
        variables: [variable({ name: 'scheme', value: 'https' }), variable({ name: 'retries', value: '3' })]
      });
      writeEnvironment({
        name: 'staging',
        extends: 'base',
        variables: [variable({ name: 'retries', value: '5' }), variable({ name: 'host', value: 'stg' })]
      });
      const filePath = writeEnvironment({
        name: 'staging-gw',
        extends: 'staging',
        variables: [variable({ name: 'host', value: 'gw' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(valueOf(result, 'scheme')).toBe('https');
      expect(valueOf(result, 'retries')).toBe('5');
      expect(valueOf(result, 'host')).toBe('gw');
    });

    it('credits each row of a three-level chain to the ancestor it came from', () => {
      writeEnvironment({ name: 'base', variables: [variable({ name: 'baseOnly', value: 'from-base' })] });
      writeEnvironment({
        name: 'staging',
        extends: 'base',
        variables: [variable({ name: 'stagingOnly', value: 'from-staging' })]
      });
      const filePath = writeEnvironment({
        name: 'qa',
        extends: 'staging',
        variables: [variable({ name: 'qaOnly', value: 'from-qa' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(sourceOf(result, 'baseOnly')).toBe('base');
      expect(sourceOf(result, 'stagingOnly')).toBe('staging');
      expect(sourceOf(result, 'qaOnly')).toBeUndefined();
    });

    it('credits an inherited row to the ancestor file name, not the name written inside it', () => {
      writeEnvironment({
        name: 'Renamed Elsewhere',
        fileName: 'base',
        variables: [variable({ name: 'scheme', value: 'https' })]
      });
      const filePath = writeEnvironment({ name: 'dev', extends: 'base' });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(sourceOf(result, 'scheme')).toBe('base');
    });

    it('resolves an environment with no rows of its own entirely from its ancestors', () => {
      writeEnvironment({ name: 'base', variables: [variable({ name: 'baseOnly', value: 'from-base' })] });
      writeEnvironment({ name: 'qa', extends: 'base', variables: [variable({ name: 'host', value: 'qa' })] });
      const filePath = writeEnvironment({ name: 'mirror', extends: 'qa' });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.variables).toEqual([]);
      expect(valueOf(result, 'baseOnly')).toBe('from-base');
      expect(valueOf(result, 'host')).toBe('qa');
    });
  });

  describe('the file the reference resolves to', () => {
    it('inherits nothing from an ancestor stored in another format', () => {
      writeEnvironment({ name: 'base', format: 'bru', variables: [variable({ name: 'scheme', value: 'https' })] });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [variable({ name: 'host', value: 'dev-host' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.inheritedVariables).toEqual([]);
    });

    it('inherits nothing into a json environment, a format that does not persist the reference', () => {
      writeEnvironment({ name: 'base', format: 'json', variables: [variable({ name: 'scheme', value: 'https' })] });
      const filePath = writeEnvironment({
        name: 'dev',
        format: 'json',
        extends: 'base',
        variables: [variable({ name: 'host', value: 'dev-host' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.extends).toBeUndefined();
      expect(result.inheritedVariables).toEqual([]);
    });

    it('inherits from a parent file written with CRLF line endings', () => {
      writeEnvironment({ name: 'base', eol: '\r\n', variables: [variable({ name: 'scheme', value: 'https' })] });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [variable({ name: 'host', value: 'dev-host' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(valueOf(result, 'scheme')).toBe('https');
    });

    it('inherits nothing from a differently-cased reference', () => {
      writeEnvironment({ name: 'Base', variables: [variable({ name: 'scheme', value: 'https' })] });
      const filePath = writeEnvironment({ name: 'dev', extends: 'base' });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.inheritedVariables).toEqual([]);
    });
  });

  describe('a reference that cannot be followed', () => {
    it('inherits nothing from an environment that extends itself', () => {
      const filePath = writeEnvironment({
        name: 'base',
        extends: 'base',
        variables: [variable({ name: 'scheme', value: 'https' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.inheritedVariables).toEqual([]);
    });

    it('inherits nothing from a reference that would escape the environments directory', () => {
      writeEnvironment({ name: 'base', variables: [variable({ name: 'scheme', value: 'leaked' })] });
      const nestedDir = path.join(environmentsDir, 'nested');
      fs.mkdirSync(nestedDir);
      const filePath = writeEnvironment({ name: 'dev', directory: nestedDir, extends: '../base' });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.inheritedVariables).toEqual([]);
    });

    it('inherits nothing from a list-shaped reference, since a single parent is the only supported shape', () => {
      writeEnvironment({ name: 'base', variables: [variable({ name: 'scheme', value: 'https' })] });
      const filePath = writeEnvironment({ name: 'dev', extends: ['base'] });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.inheritedVariables).toEqual([]);
    });
  });

  describe('a cycle in the chain', () => {
    it('resolves a two-environment cycle up to the repeat', () => {
      writeEnvironment({ name: 'base', extends: 'dev', variables: [variable({ name: 'scheme', value: 'https' })] });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [variable({ name: 'host', value: 'dev-host' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(valueOf(result, 'scheme')).toBe('https');
      expect(valueOf(result, 'host')).toBe('dev-host');
    });

    it('never re-inherits the rows the target already declares', () => {
      writeEnvironment({
        name: 'cycle-b',
        extends: 'cycle-a',
        variables: [variable({ name: 'cycleBOnly', value: 'b-value' })]
      });
      const filePath = writeEnvironment({
        name: 'cycle-a',
        extends: 'cycle-b',
        variables: [variable({ name: 'cycleAOnly', value: 'a-value' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(result.inheritedVariables.map((row) => row.name)).toEqual(['cycleBOnly']);
      expect(valueOf(result, 'cycleAOnly')).toBe('a-value');
    });
  });

  describe('disabled rows', () => {
    it('skips disabled rows on both sides of the merge', () => {
      writeEnvironment({
        name: 'base',
        variables: [
          variable({ name: 'legacyFlag', value: 'on', enabled: false }),
          variable({ name: 'apiVersion', value: 'v2' })
        ]
      });
      const filePath = writeEnvironment({
        name: 'prod',
        extends: 'base',
        variables: [variable({ name: 'apiVersion', value: 'v3', enabled: false })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(rowsOf(result).find((row) => row.name === 'legacyFlag')).toBeUndefined();
      expect(valueOf(result, 'apiVersion')).toBe('v2');
    });

    it('keeps an inherited secret when the environment redeclares it as a disabled secret', () => {
      writeEnvironment({ name: 'base', variables: [secretVariable({ name: 'token' })] });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [secretVariable({ name: 'token', enabled: false })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(withoutUids(result.inheritedVariables)).toEqual([
        { ...secretVariable({ name: 'token' }), inheritedFrom: { name: 'base' } }
      ]);
    });
  });

  describe('the split between secrets and non-secrets', () => {
    it('merges secrets only against secrets', () => {
      writeEnvironment({
        name: 'base',
        variables: [variable({ name: 'host', value: 'base-host' }), secretVariable({ name: 'token' })]
      });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [secretVariable({ name: 'token' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(rowsOf(result).filter((row) => row.name === 'token')).toEqual([secretVariable({ name: 'token' })]);
      expect(sourceOf(result, 'host')).toBe('base');
    });

    it('keeps an inherited secret that the environment redeclares as a non-secret', () => {
      writeEnvironment({ name: 'base', variables: [secretVariable({ name: 'token' })] });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [variable({ name: 'token', value: 'dev-plain-token' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(rowsOf(result)).toEqual([
        { ...secretVariable({ name: 'token' }), inheritedFrom: { name: 'base' } },
        variable({ name: 'token', value: 'dev-plain-token' })
      ]);
    });

    it('keeps an inherited non-secret that the environment redeclares as a secret', () => {
      writeEnvironment({ name: 'base', variables: [variable({ name: 'token', value: 'base-plain-token' })] });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [secretVariable({ name: 'token' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(rowsOf(result)).toEqual([
        { ...variable({ name: 'token', value: 'base-plain-token' }), inheritedFrom: { name: 'base' } },
        secretVariable({ name: 'token' })
      ]);
    });

    it('scopes shadowing to the redeclared kind across a three-level chain', () => {
      writeEnvironment({ name: 'base', variables: [variable({ name: 'apiKey', value: 'base-plain-key' })] });
      writeEnvironment({ name: 'staging', extends: 'base', variables: [secretVariable({ name: 'apiKey' })] });
      const filePath = writeEnvironment({
        name: 'staging-gw',
        extends: 'staging',
        variables: [variable({ name: 'apiKey', value: 'gw-plain-key' })]
      });

      const result = resolveEnvironmentInheritance({ filePath });

      expect(withoutUids(result.inheritedVariables)).toEqual([
        { ...secretVariable({ name: 'apiKey' }), inheritedFrom: { name: 'staging' } }
      ]);
    });
  });

  describe('the merged variable list', () => {
    it('places the inherited rows ahead of the environment rows, disabled ones included', () => {
      writeEnvironment({
        name: 'base',
        variables: [variable({ name: 'host', value: 'base-host' }), secretVariable({ name: 'token' })]
      });
      const filePath = writeEnvironment({
        name: 'dev',
        extends: 'base',
        variables: [
          variable({ name: 'token', value: 'dev-plain-token' }),
          variable({ name: 'stale', value: 'x', enabled: false })
        ]
      });

      const result = resolveEnvironmentInheritance({ filePath, merge: true });

      expect(result.inheritedVariables).toBeUndefined();
      expect(withoutUids(result.variables)).toEqual([
        { ...variable({ name: 'host', value: 'base-host' }), inheritedFrom: { name: 'base' } },
        { ...secretVariable({ name: 'token' }), inheritedFrom: { name: 'base' } },
        variable({ name: 'token', value: 'dev-plain-token' }),
        variable({ name: 'stale', value: 'x', enabled: false })
      ]);
    });
  });
});
