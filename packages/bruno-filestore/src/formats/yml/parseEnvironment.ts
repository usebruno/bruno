import type { Environment as BrunoEnvironment, EnvironmentVariable as BrunoEnvironmentVariable } from '@usebruno/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { parseYml } from './utils';
import { uuid, ensureString } from '../../utils';
import { isTypedValue } from './common/variables';

const isSecretVariable = (v: Variable | SecretVariable): v is SecretVariable => {
  return 'secret' in v && v.secret === true;
};

const toBrunoEnvironmentVariables = (variables: (Variable | SecretVariable)[] | null | undefined): BrunoEnvironmentVariable[] => {
  if (!variables?.length) {
    return [];
  }

  return variables.map((v): BrunoEnvironmentVariable => {
    if (isSecretVariable(v)) {
      const variable: BrunoEnvironmentVariable = {
        uid: uuid(),
        name: ensureString(v.name),
        value: '',
        type: 'text',
        enabled: v.disabled !== true,
        secret: true
      };

      if (v.type && v.type !== 'string' && v.type !== 'null') {
        variable.datatype = v.type;
      }

      return variable;
    }
    const variable: BrunoEnvironmentVariable = {
      uid: uuid(),
      name: ensureString(v.name),
      value: '',
      type: 'text',
      enabled: v.disabled !== true,
      secret: false
    };

    if (isTypedValue(v.value)) {
      variable.value = ensureString(v.value.data);
      if (v.value.type !== 'string' && v.value.type !== 'null') {
        variable.datatype = v.value.type;
      }
    } else {
      variable.value = ensureString(v.value);
    }

    return variable;
  });
};

const toBrunoExternalSecrets = (externalSecrets: any): BrunoEnvironment['externalSecrets'] | undefined => {
  if (!externalSecrets || typeof externalSecrets !== 'object') {
    return undefined;
  }

  const variables = Array.isArray(externalSecrets.variables)
    ? externalSecrets.variables.map((variable: any) => {
        const result: Record<string, string> = { name: ensureString(variable?.name) };
        Object.keys(variable || {}).forEach((key) => {
          if (key !== 'name') {
            result[key] = ensureString(variable[key]);
          }
        });
        return result;
      })
    : [];

  return { type: ensureString(externalSecrets.type), variables } as BrunoEnvironment['externalSecrets'];
};

const parseEnvironment = (ymlString: string): BrunoEnvironment => {
  try {
    const ocEnvironment: Environment = parseYml(ymlString);

    const brunoEnvironment: BrunoEnvironment = {
      uid: uuid(),
      name: ensureString(ocEnvironment.name, 'Untitled Environment'),
      variables: toBrunoEnvironmentVariables(ocEnvironment.variables),
      color: ocEnvironment.color || null
    };

    const externalSecrets = toBrunoExternalSecrets((ocEnvironment as any).externalSecrets);
    if (externalSecrets) {
      brunoEnvironment.externalSecrets = externalSecrets;
    }

    return brunoEnvironment;
  } catch (error) {
    console.error('Error parsing environment:', error);
    throw error;
  }
};

export default parseEnvironment;
