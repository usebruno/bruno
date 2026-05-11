import type { Environment as BrunoEnvironment, EnvironmentVariable as BrunoEnvironmentVariable } from '@usebruno/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { stringifyYml } from './utils';
import { ensureString } from '../../utils';

const toOpenCollectionEnvironmentVariables = (variables: BrunoEnvironmentVariable[]): (Variable | SecretVariable)[] | undefined => {
  if (!variables?.length) {
    return undefined;
  }

  const ocVariables: (Variable | SecretVariable)[] = variables
    .map((v: BrunoEnvironmentVariable): Variable | SecretVariable => {
      if (v.secret === true) {
        const secretVar: SecretVariable = {
          secret: true,
          name: v.name || ''
        };
        if (v.enabled === false) {
          secretVar.disabled = true;
        }
        return secretVar;
      }

      const variable: Variable = {
        name: v.name || '',
        value: ensureString(v.value)
      };

      if (v.enabled === false) {
        variable.disabled = true;
      }

      return variable;
    });

  return ocVariables.length > 0 ? ocVariables : undefined;
};

const stringifyEnvironment = (environment: BrunoEnvironment): string => {
  try {
    const ocEnvironment: Environment = {
      name: environment.name
    };

    if (environment.color) {
      ocEnvironment.color = environment.color;
    }

    if (environment.variables?.length) {
      const ocVariables = toOpenCollectionEnvironmentVariables(environment.variables);
      if (ocVariables) {
        ocEnvironment.variables = ocVariables;
      }
    }

    return stringifyYml(ocEnvironment);
  } catch (error) {
    console.error('Error stringifying environment:', error);
    throw error;
  }
};
export default stringifyEnvironment;
