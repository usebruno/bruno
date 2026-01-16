import { uuid } from '../common/index.js';
import type {
  Environment,
  Variable,
  BrunoEnvironment,
  BrunoEnvironmentVariable
} from './types';

interface OCVariable extends Omit<Variable, 'value'> {
  name: string;
  value?: string | { data: string };
  secret?: boolean;
  disabled?: boolean;
}

export const fromOpenCollectionEnvironments = (environments: Environment[] | undefined): BrunoEnvironment[] => {
  if (!environments?.length) {
    return [];
  }

  return environments.map((env): BrunoEnvironment => ({
    uid: uuid(),
    name: env.name || 'Untitled Environment',
    variables: (env.variables || []).map((v): BrunoEnvironmentVariable => {
      const variable = v as OCVariable;
      const isSecret = variable.secret === true;

      let value = '';
      if (!isSecret && variable.value !== undefined) {
        if (typeof variable.value === 'string') {
          value = variable.value;
        } else if (variable.value && typeof variable.value === 'object' && 'data' in variable.value) {
          value = variable.value.data;
        }
      }

      return {
        uid: uuid(),
        name: variable.name || '',
        value,
        type: 'text',
        enabled: variable.disabled !== true,
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
      variables: (env.variables || []).map((v): OCVariable => {
        const ocVar: OCVariable = {
          name: v.name || '',
          value: typeof v.value === 'string' ? v.value : String(v.value ?? '')
        };

        if (v.secret) {
          ocVar.secret = true;
          // Secret variables don't include the value in export
          delete ocVar.value;
        }

        if (v.enabled === false) {
          ocVar.disabled = true;
        }

        return ocVar;
      }) as Variable[]
    };

    return ocEnv;
  });
};
