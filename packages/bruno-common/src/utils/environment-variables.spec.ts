import { describe, it, expect } from '@jest/globals';
import { toVariablesMap, getDuplicateSecretNames, dedupeImportedSecrets } from './environment-variables';

type VariableProps = {
  name?: string;
  value?: unknown;
  enabled?: boolean;
  secret?: boolean;
};

const variable = (props: VariableProps) => ({ enabled: true, secret: false, ...props });

const secret = (props: Omit<VariableProps, 'secret'>) => variable({ ...props, secret: true });

describe('toVariablesMap', () => {
  it('returns an empty map when there are no variables', () => {
    expect(toVariablesMap()).toEqual({});
  });

  it('maps enabled variables by name', () => {
    const variables = [variable({ name: 'scheme', value: 'https' }), variable({ name: 'host', value: 'dev-host' })];

    expect(toVariablesMap(variables)).toEqual({ scheme: 'https', host: 'dev-host' });
  });

  it('skips disabled variables', () => {
    const variables = [variable({ name: 'host', value: 'dev-host', enabled: false })];

    expect(toVariablesMap(variables)).toEqual({});
  });

  it('skips variables without a name', () => {
    const variables = [variable({ value: 'orphan' })];

    expect(toVariablesMap(variables)).toEqual({});
  });

  it('lets a later variable override an earlier one of the same name', () => {
    const variables = [variable({ name: 'host', value: 'base-host' }), variable({ name: 'host', value: 'dev-host' })];

    expect(toVariablesMap(variables)).toEqual({ host: 'dev-host' });
  });

  it('lets a secret win over a plain variable of the same name declared after it', () => {
    const variables = [secret({ name: 'token', value: 'secret-token' }), variable({ name: 'token', value: 'plain-token' })];

    expect(toVariablesMap(variables)).toEqual({ token: 'secret-token' });
  });

  it('lets a secret win over a plain variable of the same name declared before it', () => {
    const variables = [variable({ name: 'token', value: 'plain-token' }), secret({ name: 'token', value: 'secret-token' })];

    expect(toVariablesMap(variables)).toEqual({ token: 'secret-token' });
  });

  it('ignores a disabled secret so the plain variable of the same name stands', () => {
    const variables = [
      variable({ name: 'token', value: 'plain-token' }),
      secret({ name: 'token', value: 'secret-token', enabled: false })
    ];

    expect(toVariablesMap(variables)).toEqual({ token: 'plain-token' });
  });
});

describe('getDuplicateSecretNames', () => {
  it('returns an empty set when there are no variables', () => {
    expect(getDuplicateSecretNames([]).size).toBe(0);
    expect(getDuplicateSecretNames(undefined).size).toBe(0);
  });

  it('returns an empty set when secret names are unique', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: 'apiKey', secret: true }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });

  it('flags a name carried by more than one secret', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: 'token', secret: true }
    ];
    expect([...getDuplicateSecretNames(vars)]).toEqual(['token']);
  });

  it('flags a collision even when one of the two secrets is disabled', () => {
    const vars = [
      { name: 'token', secret: true, enabled: true },
      { name: 'token', secret: true, enabled: false }
    ];
    expect([...getDuplicateSecretNames(vars)]).toEqual(['token']);
  });

  it('ignores duplicate names on non-secret variables', () => {
    const vars = [
      { name: 'host', secret: false },
      { name: 'host', secret: false }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });

  it('does not flag a plain variable and a secret that share a name', () => {
    const vars = [
      { name: 'token', secret: false },
      { name: 'token', secret: true }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });

  it('compares trimmed names and ignores blank ones', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: '  token  ', secret: true },
      { name: '   ', secret: true },
      { name: '', secret: true }
    ];
    expect([...getDuplicateSecretNames(vars)]).toEqual(['token']);
  });

  it('is case-sensitive', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: 'TOKEN', secret: true }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });
});

describe('dedupeImportedSecrets', () => {
  const makeVar = (uid: string, name: string, value: string, overrides: VariableProps = {}) => ({
    uid,
    name,
    value,
    type: 'text',
    enabled: true,
    secret: true,
    ...overrides
  });

  it('returns the list untouched when secret names are unique', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'apiKey', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('collapses two blank-valued secrets sharing a name down to the first', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', '')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('collapses every namesake when more than two collide', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', ''), makeVar('uid-3', 'token', '')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('collapses each colliding name independently and keeps the rest in order', () => {
    const variables = [
      makeVar('uid-1', 'apiKey', 'plain', { secret: false }),
      makeVar('uid-2', 'name', ''),
      makeVar('uid-3', 'name', ''),
      makeVar('uid-4', 'abc', ''),
      makeVar('uid-5', 'abc', '')
    ];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0], variables[1], variables[3]]);
  });

  // A Postman export ships secret values inline, so the twin holding one carries the only value
  // that survives the collision.
  it('keeps the twin holding a value over an earlier blank one', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', 'from-postman')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[1]]);
  });

  it('keeps the first of several twins holding values', () => {
    const variables = [makeVar('uid-1', 'token', 'first'), makeVar('uid-2', 'token', 'second')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('leaves duplicate non-secret names alone', () => {
    const variables = [makeVar('uid-1', 'host', 'a', { secret: false }), makeVar('uid-2', 'host', 'b', { secret: false })];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('leaves a plain variable sharing a secret name alone', () => {
    const variables = [makeVar('uid-1', 'token', 'plain', { secret: false }), makeVar('uid-2', 'token', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  // Nothing is stored yet at import time, so there is no live value hiding under the untrimmed key
  // and the padded namesake is safe to collapse.
  it('collapses a whitespace-padded namesake, keeping the survivor name verbatim', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', '  token  ', '')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('ignores blank secret names', () => {
    const variables = [makeVar('uid-1', '', ''), makeVar('uid-2', '   ', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('treats names differing only in case as distinct', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'TOKEN', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('keeps a disabled twin when it is the one holding a value', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', 'kept', { enabled: false })];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[1]]);
  });
});
