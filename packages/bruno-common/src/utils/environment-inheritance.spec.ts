import {
  getInheritableEnvironments,
  getInheritedEnvironments,
  resolveEnvironmentInheritance,
  validatedEnvironmentExtendsFrom
} from './environment-inheritance';

type VariableProps = {
  name: string;
  value: string;
  enabled?: boolean;
  secret?: boolean;
};

type EnvironmentProps = {
  name: string;
  variables?: ReturnType<typeof variable>[];
  extends?: string;
};

const variable = (props: VariableProps) => ({ enabled: true, secret: false, ...props });

const secret = (props: Omit<VariableProps, 'secret'>) => variable({ ...props, secret: true });

const environment = ({ name, variables = [], extends: extendsRef }: EnvironmentProps) => ({
  uid: `uid-${name}`,
  name,
  variables,
  ...(extendsRef ? { extends: extendsRef } : {})
});

const resolve = ({ environments, target, merge }: { environments: any[]; target: string; merge?: boolean }) =>
  resolveEnvironmentInheritance({
    environments,
    targetEnvironment: environments.find((env) => env.name === target),
    merge
  });

const rowsOf = (result: any) => [...result.inheritedVariables, ...(result.variables ?? [])];

const valueOf = (result: any, name: string) => rowsOf(result).find((v: any) => v.name === name)?.value;

// This spec owns the resolution algorithm end to end — chains, references, cycles, disabled rows
// and the secret split. The e2e suite covers how the resolved rows are rendered and interpolated,
// and relies on the groups below rather than re-walking each rule through the UI.
describe('resolveEnvironmentInheritance', () => {
  describe('an environment with nothing to inherit', () => {
    it('returns undefined when there is no target environment', () => {
      expect(resolveEnvironmentInheritance({ environments: [], targetEnvironment: undefined })).toBeUndefined();
    });

    it('leaves a non-inheriting environment untouched, rows and order included', () => {
      const base = environment({
        name: 'base',
        variables: [
          secret({ name: 'token', value: 'shh' }),
          variable({ name: 'host', value: 'a' }),
          variable({ name: 'off', value: 'x', enabled: false })
        ]
      });

      const result = resolve({ environments: [base], target: 'base' });

      expect(result).toEqual({ ...base, inheritedVariables: [] });
    });
  });

  describe('a chain of ancestors', () => {
    it('merges a parent into the child', () => {
      const base = environment({
        name: 'base',
        variables: [variable({ name: 'scheme', value: 'https' }), variable({ name: 'host', value: 'base-host' })]
      });
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'host', value: 'dev-host' })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, dev], target: 'dev' })!;

      expect(valueOf(result, 'scheme')).toBe('https');
      expect(valueOf(result, 'host')).toBe('dev-host');
    });

    it('applies a three-level chain furthest-ancestor first', () => {
      const base = environment({
        name: 'base',
        variables: [variable({ name: 'scheme', value: 'https' }), variable({ name: 'retries', value: '3' })]
      });
      const staging = environment({
        name: 'staging',
        variables: [variable({ name: 'retries', value: '5' }), variable({ name: 'host', value: 'stg' })],
        extends: 'base'
      });
      const stagingGw = environment({
        name: 'staging-gw',
        variables: [variable({ name: 'host', value: 'gw' })],
        extends: 'staging'
      });

      const result = resolve({ environments: [base, staging, stagingGw], target: 'staging-gw' })!;

      expect(valueOf(result, 'scheme')).toBe('https');
      expect(valueOf(result, 'retries')).toBe('5');
      expect(valueOf(result, 'host')).toBe('gw');
    });

    it('tags inherited rows with their source and leaves the child rows untagged', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'scheme', value: 'https' })] });
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'host', value: 'dev-host' })],
        extends: 'base'
      });

      const rows = rowsOf(resolve({ environments: [base, dev], target: 'dev' })!);

      expect(rows.find((row) => row.name === 'scheme').inheritedFrom).toEqual({ name: 'base', uid: 'uid-base' });
      expect(rows.find((row) => row.name === 'host').inheritedFrom).toBeUndefined();
    });

    it('credits each row of a three-level chain to the ancestor it came from', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'baseOnly', value: 'from-base' })] });
      const staging = environment({
        name: 'staging',
        variables: [variable({ name: 'stagingOnly', value: 'from-staging' })],
        extends: 'base'
      });
      const qa = environment({
        name: 'qa',
        variables: [variable({ name: 'qaOnly', value: 'from-qa' })],
        extends: 'staging'
      });

      const rows = rowsOf(resolve({ environments: [base, staging, qa], target: 'qa' })!);
      const sourceOf = (name: string) => rows.find((row) => row.name === name).inheritedFrom?.name;

      expect(sourceOf('baseOnly')).toBe('base');
      expect(sourceOf('stagingOnly')).toBe('staging');
      expect(sourceOf('qaOnly')).toBeUndefined();
    });

    it('resolves an environment with no rows of its own entirely from its ancestors', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'baseOnly', value: 'from-base' })] });
      const staging = environment({
        name: 'staging',
        variables: [variable({ name: 'host', value: 'stg' })],
        extends: 'base'
      });
      const qa = environment({ name: 'qa', variables: [variable({ name: 'host', value: 'qa' })], extends: 'staging' });
      const mirror = environment({ name: 'mirror', extends: 'qa' });

      const result = resolve({ environments: [base, staging, qa, mirror], target: 'mirror' })!;

      expect(result.variables).toEqual([]);
      expect(valueOf(result, 'baseOnly')).toBe('from-base');
      expect(valueOf(result, 'host')).toBe('qa');
    });

    it('treats an environment with no variables key at all as empty', () => {
      const base = { name: 'base', extends: 'grandparent' } as any;
      const grandparent = environment({
        name: 'grandparent',
        variables: [variable({ name: 'scheme', value: 'https' })]
      });
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'host', value: 'dev-host' })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, grandparent, dev], target: 'dev' })!;

      expect(valueOf(result, 'scheme')).toBe('https');
      expect(valueOf(result, 'host')).toBe('dev-host');
    });
  });

  describe('a reference that cannot be followed', () => {
    it('resolves an environment whose parent is missing instead of throwing', () => {
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'host', value: 'dev-host' })],
        extends: 'base'
      });

      const result = resolve({ environments: [dev], target: 'dev' })!;

      expect(result).toEqual({ ...dev, inheritedVariables: [] });
    });

    it('inherits nothing from an environment that extends itself', () => {
      const base = environment({
        name: 'base',
        variables: [variable({ name: 'scheme', value: 'https' })],
        extends: 'base'
      });

      expect(resolve({ environments: [base], target: 'base' })).toEqual({ ...base, inheritedVariables: [] });
    });

    it('ignores a list-shaped reference, since a single parent is the only supported shape', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'scheme', value: 'https' })] });
      const dev = { name: 'dev', variables: [variable({ name: 'host', value: 'dev-host' })], extends: ['base'] } as any;

      const result = resolve({ environments: [base, dev], target: 'dev' })!;

      expect(result).toEqual({ ...dev, inheritedVariables: [] });
    });

    it('inherits nothing from a reference containing a path separator', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'scheme', value: 'https' })] });
      const dev = environment({ name: 'dev', extends: '../base' });

      expect(resolve({ environments: [base, dev], target: 'dev' })).toEqual({ ...dev, inheritedVariables: [] });
    });

    it('inherits nothing from a reference carrying a line break', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'scheme', value: 'https' })] });
      const dev = environment({ name: 'dev', extends: 'base\nvars {\n  injected: pwned\n}' });

      expect(resolve({ environments: [base, dev], target: 'dev' })).toEqual({ ...dev, inheritedVariables: [] });
    });
  });

  describe('matching a reference to an environment', () => {
    it('inherits nothing from a differently-cased reference', () => {
      const differentCase = environment({
        name: 'Prod',
        variables: [variable({ name: 'host', value: 'different-case' })]
      });
      const child = environment({ name: 'child', extends: 'prod' });

      expect(resolve({ environments: [differentCase, child], target: 'child' })).toEqual({
        ...child,
        inheritedVariables: []
      });
    });

    it('inherits from the exactly-cased environment when a differently-cased one is also present', () => {
      const exact = environment({ name: 'prod', variables: [variable({ name: 'host', value: 'exact' })] });
      const differentCase = environment({
        name: 'Prod',
        variables: [variable({ name: 'host', value: 'different-case' })]
      });
      const child = environment({ name: 'child', extends: 'prod' });

      expect(valueOf(resolve({ environments: [exact, differentCase, child], target: 'child' })!, 'host')).toBe('exact');
    });
  });

  describe('a cycle in the chain', () => {
    it('resolves a two-environment cycle up to the repeat', () => {
      const base = environment({
        name: 'base',
        variables: [variable({ name: 'scheme', value: 'https' })],
        extends: 'dev'
      });
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'host', value: 'dev-host' })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, dev], target: 'dev' })!;

      expect(valueOf(result, 'scheme')).toBe('https');
      expect(valueOf(result, 'host')).toBe('dev-host');
    });

    it('never re-inherits the rows the target already declares', () => {
      const cycleA = environment({
        name: 'cycle-a',
        variables: [variable({ name: 'cycleAOnly', value: 'a-value' })],
        extends: 'cycle-b'
      });
      const cycleB = environment({
        name: 'cycle-b',
        variables: [variable({ name: 'cycleBOnly', value: 'b-value' })],
        extends: 'cycle-a'
      });

      const result = resolve({ environments: [cycleA, cycleB], target: 'cycle-a' })!;

      expect(result.inheritedVariables.map((row: any) => row.name)).toEqual(['cycleBOnly']);
      expect(valueOf(result, 'cycleAOnly')).toBe('a-value');
    });

    it('stops at the repeat when the cycle closes on a mid-chain ancestor', () => {
      const leaf = environment({ name: 'leaf', extends: 'outer' });
      const outer = environment({
        name: 'outer',
        variables: [variable({ name: 'host', value: 'outer-host' })],
        extends: 'inner'
      });
      const inner = environment({
        name: 'inner',
        variables: [variable({ name: 'host', value: 'inner-host' }), variable({ name: 'scheme', value: 'https' })],
        extends: 'outer'
      });

      const result = resolve({ environments: [leaf, outer, inner], target: 'leaf' })!;

      expect(valueOf(result, 'host')).toBe('outer-host');
      expect(valueOf(result, 'scheme')).toBe('https');
    });
  });

  describe('disabled rows', () => {
    it('skips disabled rows on both sides of the merge', () => {
      const base = environment({
        name: 'base',
        variables: [
          variable({ name: 'legacyFlag', value: 'on', enabled: false }),
          variable({ name: 'apiVersion', value: 'v2' })
        ]
      });
      const prod = environment({
        name: 'prod',
        variables: [variable({ name: 'apiVersion', value: 'v3', enabled: false })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, prod], target: 'prod' })!;

      expect(rowsOf(result).find((row: any) => row.name === 'legacyFlag')).toBeUndefined();
      expect(valueOf(result, 'apiVersion')).toBe('v2');
    });

    it('keeps an inherited secret when the environment redeclares it as a disabled secret', () => {
      const base = environment({ name: 'base', variables: [secret({ name: 'token', value: 'base-secret' })] });
      const dev = environment({
        name: 'dev',
        variables: [secret({ name: 'token', value: 'dev-secret', enabled: false })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, dev], target: 'dev' })!;

      expect(result.inheritedVariables).toEqual([
        {
          name: 'token',
          value: 'base-secret',
          enabled: true,
          secret: true,
          inheritedFrom: { name: 'base', uid: 'uid-base' }
        }
      ]);
    });
  });

  describe('the split between secrets and non-secrets', () => {
    it('merges secrets only against secrets', () => {
      const base = environment({
        name: 'base',
        variables: [secret({ name: 'token', value: 'base-secret' }), variable({ name: 'host', value: 'base-host' })]
      });
      const dev = environment({
        name: 'dev',
        variables: [secret({ name: 'token', value: 'dev-secret' })],
        extends: 'base'
      });

      const rows = rowsOf(resolve({ environments: [base, dev], target: 'dev' })!);

      expect(rows.filter((row) => row.name === 'token')).toHaveLength(1);
      expect(rows.find((row) => row.name === 'token').value).toBe('dev-secret');
    });

    it('keeps an inherited secret that the environment redeclares as a non-secret', () => {
      const base = environment({ name: 'base', variables: [secret({ name: 'token', value: 'base-secret' })] });
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'token', value: 'dev-plain-token' })],
        extends: 'base'
      });

      const rows = rowsOf(resolve({ environments: [base, dev], target: 'dev' })!);

      expect(rows).toEqual([
        {
          name: 'token',
          value: 'base-secret',
          enabled: true,
          secret: true,
          inheritedFrom: { name: 'base', uid: 'uid-base' }
        },
        { name: 'token', value: 'dev-plain-token', enabled: true, secret: false }
      ]);
    });

    it('keeps an inherited non-secret that the environment redeclares as a secret', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'token', value: 'base-plain-token' })] });
      const dev = environment({
        name: 'dev',
        variables: [secret({ name: 'token', value: 'dev-secret' })],
        extends: 'base'
      });

      const rows = rowsOf(resolve({ environments: [base, dev], target: 'dev' })!);

      expect(rows).toEqual([
        {
          name: 'token',
          value: 'base-plain-token',
          enabled: true,
          secret: false,
          inheritedFrom: { name: 'base', uid: 'uid-base' }
        },
        { name: 'token', value: 'dev-secret', enabled: true, secret: true }
      ]);
    });

    it('shadows only the inherited secret when the environment redeclares the name as a secret', () => {
      const base = environment({
        name: 'base',
        variables: [
          variable({ name: 'token', value: 'base-plain-token' }),
          secret({ name: 'token', value: 'base-secret' })
        ]
      });
      const dev = environment({
        name: 'dev',
        variables: [secret({ name: 'token', value: 'dev-secret' })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, dev], target: 'dev' })!;

      expect(result.inheritedVariables).toEqual([
        {
          name: 'token',
          value: 'base-plain-token',
          enabled: true,
          secret: false,
          inheritedFrom: { name: 'base', uid: 'uid-base' }
        }
      ]);
    });

    it('shadows only the inherited non-secret when the environment redeclares the name as a non-secret', () => {
      const base = environment({
        name: 'base',
        variables: [
          variable({ name: 'token', value: 'base-plain-token' }),
          secret({ name: 'token', value: 'base-secret' })
        ]
      });
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'token', value: 'dev-plain-token' })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, dev], target: 'dev' })!;

      expect(result.inheritedVariables).toEqual([
        {
          name: 'token',
          value: 'base-secret',
          enabled: true,
          secret: true,
          inheritedFrom: { name: 'base', uid: 'uid-base' }
        }
      ]);
    });

    it('scopes shadowing to the redeclared kind across a three-level chain', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'apiKey', value: 'base-plain-key' })] });
      const staging = environment({
        name: 'staging',
        variables: [secret({ name: 'apiKey', value: 'staging-secret-key' })],
        extends: 'base'
      });
      const stagingGw = environment({
        name: 'staging-gw',
        variables: [variable({ name: 'apiKey', value: 'gw-plain-key' })],
        extends: 'staging'
      });

      const result = resolve({ environments: [base, staging, stagingGw], target: 'staging-gw' })!;

      expect(result.inheritedVariables).toEqual([
        {
          name: 'apiKey',
          value: 'staging-secret-key',
          enabled: true,
          secret: true,
          inheritedFrom: { name: 'staging', uid: 'uid-staging' }
        }
      ]);
    });

    it('keeps a non-secret and a secret of the same name declared side by side, secret last', () => {
      const base = environment({ name: 'base', variables: [variable({ name: 'host', value: 'base-host' })] });
      const dev = environment({
        name: 'dev',
        variables: [
          variable({ name: 'token', value: 'dev-plain-token' }),
          secret({ name: 'token', value: 'dev-secret' })
        ],
        extends: 'base'
      });

      const rows = rowsOf(resolve({ environments: [base, dev], target: 'dev' })!);

      expect(rows.map((row) => [row.name, row.secret, row.value])).toEqual([
        ['host', false, 'base-host'],
        ['token', false, 'dev-plain-token'],
        ['token', true, 'dev-secret']
      ]);
    });
  });

  describe('the merged variable list', () => {
    it('merges an inherited secret and a redeclared non-secret of the same name, own rows last', () => {
      const base = environment({
        name: 'base',
        variables: [variable({ name: 'host', value: 'base-host' }), secret({ name: 'token', value: 'base-secret' })]
      });
      const dev = environment({
        name: 'dev',
        variables: [variable({ name: 'token', value: 'dev-plain-token' })],
        extends: 'base'
      });

      const result = resolve({ environments: [base, dev], target: 'dev', merge: true })!;

      expect(result.variables).toEqual([
        {
          name: 'host',
          value: 'base-host',
          enabled: true,
          secret: false,
          inheritedFrom: { name: 'base', uid: 'uid-base' }
        },
        {
          name: 'token',
          value: 'base-secret',
          enabled: true,
          secret: true,
          inheritedFrom: { name: 'base', uid: 'uid-base' }
        },
        { name: 'token', value: 'dev-plain-token', enabled: true, secret: false }
      ]);
    });
  });
});

describe('getInheritedEnvironments', () => {
  const walk = ({ environments, target }: { environments: any[]; target: string }) =>
    getInheritedEnvironments({
      environments,
      environment: environments.find((env) => env.name === target)
    });

  it('reports no missing parent when the whole chain resolves', () => {
    const base = environment({ name: 'base' });
    const staging = environment({ name: 'staging', extends: 'base' });
    const dev = environment({ name: 'dev', extends: 'staging' });

    const { inheritedEnvironments, missingInheritedEnvironmentName } = walk({
      environments: [base, staging, dev],
      target: 'dev'
    });

    expect(inheritedEnvironments.map((env) => env.name)).toEqual(['base', 'staging']);
    expect(missingInheritedEnvironmentName).toBeNull();
  });

  it('reports the reference that resolves to nothing', () => {
    const dev = environment({ name: 'dev', extends: 'base' });

    const { inheritedEnvironments, missingInheritedEnvironmentName } = walk({ environments: [dev], target: 'dev' });

    expect(inheritedEnvironments).toEqual([]);
    expect(missingInheritedEnvironmentName).toBe('base');
  });

  it('reports a missing reference found part way up the chain', () => {
    const staging = environment({ name: 'staging', extends: 'base' });
    const dev = environment({ name: 'dev', extends: 'staging' });

    const { inheritedEnvironments, missingInheritedEnvironmentName } = walk({
      environments: [staging, dev],
      target: 'dev'
    });

    expect(inheritedEnvironments.map((env) => env.name)).toEqual(['staging']);
    expect(missingInheritedEnvironmentName).toBe('base');
  });

  it('reports no missing parent for a cyclic chain', () => {
    const base = environment({ name: 'base', extends: 'dev' });
    const dev = environment({ name: 'dev', extends: 'base' });

    expect(walk({ environments: [base, dev], target: 'dev' }).missingInheritedEnvironmentName).toBeNull();
  });

  it('reports a missing parent for a differently-cased reference', () => {
    const base = environment({ name: 'Base' });
    const dev = environment({ name: 'dev', extends: 'base' });

    const { inheritedEnvironments, missingInheritedEnvironmentName } = walk({
      environments: [base, dev],
      target: 'dev'
    });

    expect(inheritedEnvironments).toEqual([]);
    expect(missingInheritedEnvironmentName).toBe('base');
  });

  it('reports no missing parent for a list-shaped reference, which is not followed', () => {
    const dev = { ...environment({ name: 'dev' }), extends: ['base'] } as any;

    const { inheritedEnvironments, missingInheritedEnvironmentName } = walk({ environments: [dev], target: 'dev' });

    expect(inheritedEnvironments).toEqual([]);
    expect(missingInheritedEnvironmentName).toBeNull();
  });
});

describe('getInheritableEnvironments', () => {
  // Environments are named after their depth in the inheritance chain: `inherit-level-2`
  // inherits from `inherit-level-1`, `inherit-level-3` from `inherit-level-2`, and
  // `inherit-standalone` sits outside the chain.
  const LEVEL_1 = 'inherit-level-1';
  const LEVEL_2 = 'inherit-level-2';
  const LEVEL_3 = 'inherit-level-3';
  const STANDALONE = 'inherit-standalone';

  const inheritableNames = ({ environments, target }: { environments: any[]; target?: string }) =>
    getInheritableEnvironments({
      environments,
      targetEnvironment: environments.find((env) => env.name === target)
    }).map((env) => env.name);

  it('offers every other environment when none of them inherit from the target', () => {
    const level1 = environment({ name: LEVEL_1 });
    const level2 = environment({ name: LEVEL_2, extends: LEVEL_1 });
    const standalone = environment({ name: STANDALONE });

    expect(inheritableNames({ environments: [level1, level2, standalone], target: STANDALONE })).toEqual([
      LEVEL_1,
      LEVEL_2
    ]);
  });

  it('never offers the target itself', () => {
    const level1 = environment({ name: LEVEL_1 });

    expect(inheritableNames({ environments: [level1], target: LEVEL_1 })).toEqual([]);
  });

  it('hides an environment that inherits from the target directly', () => {
    const level1 = environment({ name: LEVEL_1 });
    const level2 = environment({ name: LEVEL_2, extends: LEVEL_1 });

    expect(inheritableNames({ environments: [level1, level2], target: LEVEL_1 })).toEqual([]);
  });

  it('hides an environment that inherits from the target through a chain', () => {
    const level1 = environment({ name: LEVEL_1 });
    const level2 = environment({ name: LEVEL_2, extends: LEVEL_1 });
    const level3 = environment({ name: LEVEL_3, extends: LEVEL_2 });
    const standalone = environment({ name: STANDALONE });

    expect(inheritableNames({ environments: [level1, level2, level3, standalone], target: LEVEL_1 })).toEqual([
      STANDALONE
    ]);
  });

  it('offers a descendant referencing the target by a different case, since that reference resolves to nothing', () => {
    const level1 = environment({ name: 'Inherit-Level-1' });
    const level2 = environment({ name: LEVEL_2, extends: LEVEL_1 });

    expect(inheritableNames({ environments: [level1, level2], target: 'Inherit-Level-1' })).toEqual([LEVEL_2]);
  });

  it('offers an environment caught in a cycle of its own', () => {
    const cycleA = environment({ name: 'cycle-a', extends: 'cycle-b' });
    const cycleB = environment({ name: 'cycle-b', extends: 'cycle-a' });
    const standalone = environment({ name: STANDALONE });

    expect(inheritableNames({ environments: [cycleA, cycleB, standalone], target: STANDALONE })).toEqual([
      'cycle-a',
      'cycle-b'
    ]);
  });

  it('offers an environment whose parent is missing', () => {
    const orphan = environment({ name: 'orphan', extends: 'gone' });
    const standalone = environment({ name: STANDALONE });

    expect(inheritableNames({ environments: [orphan, standalone], target: STANDALONE })).toEqual(['orphan']);
  });

  it('offers every environment when there is no target', () => {
    const level1 = environment({ name: LEVEL_1 });
    const standalone = environment({ name: STANDALONE });

    expect(inheritableNames({ environments: [level1, standalone] })).toEqual([LEVEL_1, STANDALONE]);
  });
});

describe('validatedEnvironmentExtendsFrom', () => {
  it('trims a name', () => {
    expect(validatedEnvironmentExtendsFrom('  staging  ')).toBe('staging');
  });

  it('keeps a list of names as given', () => {
    expect(validatedEnvironmentExtendsFrom(['base', 'staging'])).toEqual(['base', 'staging']);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['an empty name', ''],
    ['a whitespace-only name', '   '],
    ['an empty list', []],
    ['a list holding a non-name', ['base', 42]],
    ['a non-reference type', { name: 'base' }]
  ])('returns undefined for %s', (_label, reference) => {
    expect(validatedEnvironmentExtendsFrom(reference)).toBeUndefined();
  });

  describe('a name no environment could be created with', () => {
    it.each([
      ['a path separator', 'reports/weekly'],
      ['a quote', 'say "hi"'],
      ['a leading hyphen', '-staging'],
      ['a trailing dot', 'staging.'],
      ['a reserved device name', 'CON'],
      ['more than 255 characters', 'e'.repeat(256)]
    ])('returns undefined for %s', (_label, reference) => {
      expect(validatedEnvironmentExtendsFrom(reference)).toBeUndefined();
    });

    it('drops the whole list rather than the offending entry alone', () => {
      expect(validatedEnvironmentExtendsFrom(['base', 'reports/weekly'])).toBeUndefined();
    });
  });

  it('trims each name in a list', () => {
    expect(validatedEnvironmentExtendsFrom(['  base  ', 'staging'])).toEqual(['base', 'staging']);
  });
});
