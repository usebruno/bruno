import type { Environment as BrunoEnvironment, EnvironmentVariable as BrunoEnvironmentVariable } from '@usebruno/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { stringifyYml } from './utils';
import { hasTypedMetadata, toOpenCollectionTypedValue, serializeVariableValue } from './common/datatype';
import { validatedEnvironmentExtendsFrom } from '@usebruno/common/utils';

export const toOpenCollectionEnvironmentVariables = (variables: BrunoEnvironmentVariable[]): (Variable | SecretVariable)[] | undefined => {
  if (!variables?.length) {
    return undefined;
  }

  // An empty or null description is omitted: parseEnvironment reads it back as absent, so
  // writing it would change the file on every re-save of a parsed environment.
  const ocVariables: (Variable | SecretVariable)[] = variables
    .map((v: BrunoEnvironmentVariable): Variable | SecretVariable => {
      if (v.secret === true) {
        const secretVar: SecretVariable = {
          secret: true,
          name: v.name || ''
        };
        if (hasTypedMetadata(v)) {
          secretVar.type = v.dataType;
        }
        if (v.enabled === false) {
          secretVar.disabled = true;
        }
        if (v.description) {
          secretVar.description = v.description;
        }
        return secretVar;
      }

      const valueStr = serializeVariableValue(v.value);

      const variable: Variable = {
        name: v.name || '',
        value: hasTypedMetadata(v) ? toOpenCollectionTypedValue(v, valueStr) : valueStr
      };

      if (v.enabled === false) {
        variable.disabled = true;
      }

      if (v.description) {
        variable.description = v.description;
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

    const environmentExtendsFrom = validatedEnvironmentExtendsFrom(environment.extends);
    if (environmentExtendsFrom) {
      (ocEnvironment as any).extends = environmentExtendsFrom;
    }

    if (environment.color) {
      ocEnvironment.color = environment.color;
    }

    if (environment.variables?.length) {
      const ocVariables = toOpenCollectionEnvironmentVariables(environment.variables);
      if (ocVariables) {
        ocEnvironment.variables = ocVariables;
      }
    }

    if (environment.externalSecrets) {
      (ocEnvironment as any).externalSecrets = {
        type: environment.externalSecrets.type,
        variables: (environment.externalSecrets.variables || []).map((variable) => ({ ...variable }))
      };
    }

    return stringifyYml(ocEnvironment);
  } catch (error) {
    console.error('Error stringifying environment:', error);
    throw error;
  }
};
export default stringifyEnvironment;
