import { validateName } from './naming';

export interface InheritedFrom {
  name: string;
  uid: string;
}

export interface InheritableVariable {
  name: string;
  enabled?: boolean;
  secret?: boolean;
  inheritedFrom?: InheritedFrom;
}

export interface ExtendableEnvironment {
  uid: string;
  name: string;
  variables: InheritableVariable[];
  extends?: string | null;
}

export interface UnresolvedInheritance {
  missingInheritedEnvironmentName?: string | null;
  cyclicInheritancePath?: string[] | null;
}

export type ResolvedEnvironment<E extends ExtendableEnvironment, Merge extends boolean = false> = Merge extends true
  ? E & UnresolvedInheritance
  : E & { inheritedVariables: E['variables'] } & UnresolvedInheritance;

export const validatedEnvironmentName = (reference: unknown): string | undefined => {
  if (typeof reference !== 'string') {
    return undefined;
  }

  const name = reference.trim();
  return validateName(name) ? name : undefined;
};

export const validatedEnvironmentExtendsFrom = (environmentExtendsReference: unknown): string | string[] | undefined => {
  if (typeof environmentExtendsReference === 'string') {
    return validatedEnvironmentName(environmentExtendsReference);
  }

  if (!Array.isArray(environmentExtendsReference) || !environmentExtendsReference.length) {
    return undefined;
  }

  const names = environmentExtendsReference.map(validatedEnvironmentName);
  return names.every((name): name is string => name !== undefined) ? names : undefined;
};

/**
 * An environment's `extends` chain, root ancestor first, so later entries override earlier ones.
 * The walk stops at an unresolvable reference or at a name already seen, so a broken or cyclic
 * chain yields the ancestors found so far, alongside the reference that ended the walk — nothing
 * keeps an `extends` name pointing at an environment that still exists, or keeps a chain from
 * closing a loop.
 */
export const getInheritedEnvironments = <E extends ExtendableEnvironment>({
  environments,
  environment
}: {
  environments: E[];
  environment: E;
}): {
  inheritedEnvironments: E[];
  missingInheritedEnvironmentName: string | null;
  cyclicInheritancePath: string[] | null;
} => {
  const scope = environments ?? [];
  const inheritedEnvironments: E[] = [];
  const walkedNames: string[] = [environment.name];

  let current: E = environment;
  let missingInheritedEnvironmentName: string | null = null;
  let cyclicInheritancePath: string[] | null = null;

  while (typeof current.extends === 'string') {
    const parent = scope.find((environment) => environment.name === current.extends);
    if (!parent) {
      missingInheritedEnvironmentName = current.extends;
      break;
    }

    const cycleStartIndex = walkedNames.indexOf(parent.name);
    if (cycleStartIndex !== -1) {
      cyclicInheritancePath = [...walkedNames.slice(cycleStartIndex), parent.name];
      break;
    }

    walkedNames.push(parent.name);
    inheritedEnvironments.push(parent);
    current = parent;
  }

  return {
    inheritedEnvironments: inheritedEnvironments.reverse(),
    missingInheritedEnvironmentName,
    cyclicInheritancePath
  };
};

/**
 * The environments a target may inherit from: everything but itself and its descendants,
 * since picking one of those closes a cycle.
 */
export const getInheritableEnvironments = <E extends ExtendableEnvironment>({
  environments = [],
  targetEnvironment
}: {
  environments: E[];
  targetEnvironment: E | undefined;
}): E[] => {
  if (!targetEnvironment) {
    return environments;
  }

  return environments.filter((environment) => {
    if (environment.uid === targetEnvironment.uid) {
      return false;
    }

    const { inheritedEnvironments } = getInheritedEnvironments({ environments, environment });
    return !inheritedEnvironments.some((inheritedEnvironment) => inheritedEnvironment.uid === targetEnvironment.uid);
  });
};

export const resolveEnvironmentInheritance = <
  E extends ExtendableEnvironment,
  Merge extends boolean = false
>({
  environments,
  targetEnvironment,
  merge
}: {
  environments: E[];
  targetEnvironment: E | undefined;
  merge?: Merge;
}): ResolvedEnvironment<E, Merge> | undefined => {
  if (!targetEnvironment) {
    return undefined;
  }

  if (!targetEnvironment.extends) {
    return (
      merge ? { ...targetEnvironment } : { ...targetEnvironment, inheritedVariables: [] }
    ) as ResolvedEnvironment<E, Merge>;
  }

  const { inheritedEnvironments, missingInheritedEnvironmentName, cyclicInheritancePath } = getInheritedEnvironments({
    environments: environments ?? [],
    environment: targetEnvironment
  });

  const nonSecrets = new Map<string, InheritableVariable>();
  const secrets = new Map<string, InheritableVariable>();

  inheritedEnvironments.forEach((environment) => {
    const inheritedFrom = { name: environment.name, uid: environment.uid };

    environment.variables?.forEach((v) => {
      if (!v.enabled) {
        return;
      }

      const variable = { ...v, inheritedFrom };
      if (v.secret) {
        secrets.set(v.name, variable);
      } else {
        nonSecrets.set(v.name, variable);
      }
    });
  });

  const ownVariables = targetEnvironment.variables ?? [];
  ownVariables.forEach((v) => {
    if (!v.enabled) {
      return;
    }

    if (v.secret) {
      secrets.delete(v.name);
    } else {
      nonSecrets.delete(v.name);
    }
  });

  const inheritedVariables = [...nonSecrets.values(), ...secrets.values()] as E['variables'];

  if (merge) {
    return {
      ...targetEnvironment,
      variables: [...inheritedVariables, ...ownVariables],
      missingInheritedEnvironmentName,
      cyclicInheritancePath
    } as ResolvedEnvironment<E, Merge>;
  }

  return {
    ...targetEnvironment,
    inheritedVariables,
    missingInheritedEnvironmentName,
    cyclicInheritancePath
  } as ResolvedEnvironment<E, Merge>;
};
