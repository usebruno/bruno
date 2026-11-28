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

export interface InheritableExternalSecretVariable {
  name: string;
  inheritedFrom?: InheritedFrom;
  [key: string]: string | InheritedFrom | undefined;
}

export interface InheritableExternalSecrets {
  type: string;
  variables: InheritableExternalSecretVariable[];
}

export interface ExtendableEnvironment {
  uid: string;
  name: string;
  variables: InheritableVariable[];
  externalSecrets?: InheritableExternalSecrets | null;
  extends?: string | null;
}

export interface UnresolvedInheritance {
  missingInheritedEnvironmentName?: string | null;
  cyclicInheritancePath?: string[] | null;
}

export type ResolvedEnvironment<E extends ExtendableEnvironment, Merge extends boolean = false> = Merge extends true
  ? E & UnresolvedInheritance
  : E & {
    inheritedVariables: E['variables'];
    inheritedExternalSecrets: InheritableExternalSecrets | undefined;
  } & UnresolvedInheritance;

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
      merge
        ? { ...targetEnvironment }
        : { ...targetEnvironment, inheritedVariables: [], inheritedExternalSecrets: undefined }
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

  // External secrets follow the same root-first walk: the nearest ancestor that defines a
  // block decides the inherited provider type, and the target's own block decides the
  // effective one. Ancestors on a different provider type do not contribute variables,
  // since a single block can only be fetched from one provider.
  const ownExternalSecrets = targetEnvironment.externalSecrets ?? undefined;
  const inheritedSecretEntries = new Map<string, { variable: InheritableExternalSecretVariable; type: string }>();
  let inheritedSecretsType: string | undefined;

  inheritedEnvironments.forEach((environment) => {
    const block = environment.externalSecrets;
    if (!block || typeof block.type !== 'string' || !block.type) {
      return;
    }

    inheritedSecretsType = block.type;
    const inheritedFrom = { name: environment.name, uid: environment.uid };

    (block.variables ?? []).forEach((v) => {
      if (!v || typeof v.name !== 'string') {
        return;
      }
      inheritedSecretEntries.set(v.name, { variable: { ...v, inheritedFrom }, type: block.type });
    });
  });

  const effectiveExternalSecretsType = ownExternalSecrets?.type || inheritedSecretsType;
  const ownExternalSecretNames = new Set((ownExternalSecrets?.variables ?? []).map((v) => v?.name));
  const inheritedSecretVariables = [...inheritedSecretEntries.values()]
    .filter(({ variable, type }) => type === effectiveExternalSecretsType && !ownExternalSecretNames.has(variable.name))
    .map(({ variable }) => variable);

  const inheritedExternalSecrets: InheritableExternalSecrets | undefined = inheritedSecretVariables.length
    ? { type: effectiveExternalSecretsType as string, variables: inheritedSecretVariables }
    : undefined;

  if (merge) {
    const mergedExternalSecrets
      = ownExternalSecrets || inheritedExternalSecrets
        ? {
            type: effectiveExternalSecretsType as string,
            variables: [...(inheritedExternalSecrets?.variables ?? []), ...(ownExternalSecrets?.variables ?? [])]
          }
        : targetEnvironment.externalSecrets;
    return {
      ...targetEnvironment,
      variables: [...inheritedVariables, ...ownVariables],
      externalSecrets: mergedExternalSecrets,
      missingInheritedEnvironmentName,
      cyclicInheritancePath
    } as ResolvedEnvironment<E, Merge>;
  }

  return {
    ...targetEnvironment,
    inheritedVariables,
    inheritedExternalSecrets,
    missingInheritedEnvironmentName,
    cyclicInheritancePath
  } as ResolvedEnvironment<E, Merge>;
};
