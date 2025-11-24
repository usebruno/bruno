import type { Environment as BrunoEnvironment, EnvironmentVariable as BrunoEnvironmentVariable } from '@usebruno/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable } from '@opencollection/types/common/variables';
import { stringifyYml } from './utils';

const toOpenCollectionEnvironmentVariables = (variables: BrunoEnvironmentVariable[]): Variable[] | undefined => {
  if (!variables?.length) {
    return undefined;
  }

  const ocVariables: Variable[] = variables
    .filter((v: BrunoEnvironmentVariable) => {
      // todo: currently neithwe bru lang nor bruno app supports non-string values
      // update this when bruno app supports non-string values
      return typeof v.value === 'string';
    })
    .map((v: BrunoEnvironmentVariable): Variable => {
      const variable: Variable = {
        name: v.name || '',
        value: v.value as string
      };

      if (v.enabled === false) {
        variable.disabled = true;
      }

      if (v.secret === true) {
        variable.transient = true;
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

    // Convert variables if they exist
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
