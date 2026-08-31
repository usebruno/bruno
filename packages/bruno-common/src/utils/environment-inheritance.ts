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

export type ResolvedEnvironment<E extends ExtendableEnvironment, Merge extends boolean = false> = Merge extends true
  ? E
  : E & { inheritedVariables: E['variables'] };

const validatedEnvironmentName = (reference: unknown): string | undefined => {
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
 * chain yields the ancestors found so far, alongside the name that resolved to nothing — a parent
 * that was deleted, or renamed outside the app, leaves the references to it behind.
 */
export const getInheritedEnvironments = <E extends ExtendableEnvironment>({
  environments,
  environment
}: {
  environments: E[];
  environment: E;
}): { inheritedEnvironments: E[]; missingInheritedEnvironmentName: string | null } => {
  const scope = environments ?? [];
  const inheritedEnvironments: E[] = [];
  const walked = new Set<string>([environment.name]);

  let current: E = environment;
  let missingInheritedEnvironmentName: string | null = null;

  while (typeof current.extends === 'string') {
    const parent = scope.find((environment) => environment.name === current.extends);
    if (!parent) {
      missingInheritedEnvironmentName = current.extends;
      break;
    }

    if (walked.has(parent.name)) {
      break;
    }

    walked.add(parent.name);
    inheritedEnvironments.push(parent);
    current = parent;
  }

  return { inheritedEnvironments: inheritedEnvironments.reverse(), missingInheritedEnvironmentName };
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

export const resolveEnvironmentInheritance = <E extends ExtendableEnvironment, Merge extends boolean = false>({
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

  const { inheritedEnvironments } = getInheritedEnvironments({
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
    return { ...targetEnvironment, variables: [...inheritedVariables, ...ownVariables] } as ResolvedEnvironment<E, Merge>;
  }

  return { ...targetEnvironment, inheritedVariables } as ResolvedEnvironment<E, Merge>;
};
