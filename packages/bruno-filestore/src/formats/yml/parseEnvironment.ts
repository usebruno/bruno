import type { Environment as BrunoEnvironment, EnvironmentVariable as BrunoEnvironmentVariable } from '@usebruno/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable } from '@opencollection/types/common/variables';
import { parseYml } from './utils';
import { uuid } from '../../utils';

const toBrunoEnvironmentVariables = (variables: Variable[] | null | undefined): BrunoEnvironmentVariable[] => {
  if (!variables?.length) {
    return [];
  }

  return variables.map((v: Variable): BrunoEnvironmentVariable => {
    const variable: BrunoEnvironmentVariable = {
      uid: uuid(),
      name: v.name || '',
      value: v.value as string || '',
      type: 'text',
      enabled: v.disabled !== true,
      secret: v.transient === true
    };
    return variable;
  });
};

const parseEnvironment = (ymlString: string): BrunoEnvironment => {
  try {
    const ocEnvironment: Environment = parseYml(ymlString);

    const brunoEnvironment: BrunoEnvironment = {
      uid: uuid(),
      name: ocEnvironment.name || 'Untitled Environment',
      variables: toBrunoEnvironmentVariables(ocEnvironment.variables)
    };

    return brunoEnvironment;
  } catch (error) {
    console.error('Error parsing environment:', error);
    throw error;
  }
};

export default parseEnvironment;
