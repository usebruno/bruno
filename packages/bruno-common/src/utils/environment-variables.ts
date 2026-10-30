export interface EnvironmentVariable {
  name?: string;
  value?: unknown;
  enabled?: boolean;
  secret?: boolean;
}

/**
 * Flattens environment variables into a name → value map. Later entries override earlier ones, so
 * callers order the list by precedence (inherited variables ahead of the environment's own), and a
 * secret wins over a plain variable of the same name whichever order the two appear in.
 */
export const toVariablesMap = (environmentVariables: EnvironmentVariable[] = []): Record<string, unknown> => {
  const variables: Record<string, unknown> = {};
  const secretNames = new Set<string>();

  for (const variable of environmentVariables) {
    if (!variable.name || !variable.enabled) {
      continue;
    }
    if (variable.secret) {
      secretNames.add(variable.name);
    } else if (secretNames.has(variable.name)) {
      continue;
    }
    variables[variable.name] = variable.value;
  }

  return variables;
};

/**
 * Secret values are persisted in a name-keyed side store and re-attached on read by name, so two
 * secrets sharing a name collapse to one and the second loses its value. Names must therefore be
 * unique among secrets. Returns the set of names carried by more than one secret variable. Only
 * secret rows are counted, so callers need not filter by tab.
 */
export const getDuplicateSecretNames = (variables?: EnvironmentVariable[] | null): Set<string> => {
  const counts = new Map<string, number>();
  (variables || []).forEach((v) => {
    if (v.secret && v.name && v.name.trim() !== '') {
      const key = v.name.trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
};

/**
 * Strips the duplicate secrets out of an imported environment, so an import never lands the user
 * with a collision they did not author. Keeps whichever twin holds a value, since a Postman export
 * ships secret values inline.
 */
export const dedupeImportedSecrets = <T extends EnvironmentVariable>(variables: T[]): T[] => {
  const duplicates = getDuplicateSecretNames(variables);
  if (duplicates.size === 0) {
    return variables;
  }

  const survivors = new Map<string, T>();
  variables.forEach((v) => {
    const name = (v.name || '').trim();
    if (!v.secret || !duplicates.has(name)) return;
    const current = survivors.get(name);
    if (!current || (!current.value && v.value)) survivors.set(name, v);
  });

  return variables.filter((v) => {
    const name = (v.name || '').trim();
    return !v.secret || !duplicates.has(name) || survivors.get(name) === v;
  });
};
