import { uuid } from '../common/index.js';
import type {
  Environment,
  Variable,
  SecretVariable,
  BrunoEnvironment,
  BrunoEnvironmentVariable
} from './types';

export const fromOpenCollectionEnvironments = (environments: Environment[] | undefined): BrunoEnvironment[] => {
  if (!environments?.length) {
    return [];
  }

  return environments.map((env): BrunoEnvironment => ({
    uid: uuid(),
    name: env.name || 'Untitled Environment',
    variables: (env.variables || []).map((v): BrunoEnvironmentVariable => {
      const isSecret = 'secret' in v && v.secret === true;
      const variable = v as Variable;
      const secretVariable = v as SecretVariable;

      let value = '';
      if (!isSecret && variable.value !== undefined) {
        if (typeof variable.value === 'string') {
          value = variable.value;
        } else if ('data' in variable.value) {
          value = variable.value.data;
        }
      }

      return {
        uid: uuid(),
        name: isSecret ? (secretVariable.name || '') : (variable.name || ''),
        value,
        type: 'text',
        enabled: v.disabled !== true,
        secret: isSecret
      };
    })
  }));
};

export const toOpenCollectionEnvironments = (environments: BrunoEnvironment[] | undefined): Environment[] | undefined => {
  if (!environments?.length) {
    return undefined;
  }

  return environments.map((env): Environment => {
    const ocEnv: Environment = {
      name: env.name || 'Untitled Environment',
      variables: (env.variables || []).map((v): Variable | SecretVariable => {
        if (v.secret) {
          const secretVar: SecretVariable = {
            secret: true,
            name: v.name || ''
          };

          if (v.enabled === false) {
            secretVar.disabled = true;
          }

          return secretVar;
        }

        const ocVar: Variable = {
          name: v.name || '',
          value: typeof v.value === 'string' ? v.value : String(v.value ?? '')
        };

        if (v.enabled === false) {
          ocVar.disabled = true;
        }

        return ocVar;
      })
    };

    return ocEnv;
  });
};
