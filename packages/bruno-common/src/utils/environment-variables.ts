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
